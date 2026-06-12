import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';

function getConfig() {
  return {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || 'logicpay-backups',
    intervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10),
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10),
    tmpDir: process.env.BACKUP_TMP_DIR || join(tmpdir(), 'logicpay-backups'),
  };
}

let s3Client = null;
let schedulerTimer = null;

function getS3Client() {
  if (!s3Client) {
    const { endpoint, accessKeyId, secretAccessKey } = getConfig();
    s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3Client;
}

export function isBackupConfigured() {
  const { endpoint, accessKeyId, secretAccessKey } = getConfig();
  return !!(endpoint && accessKeyId && secretAccessKey);
}

export async function backupDatabase(db) {
  const { tmpDir } = getConfig();
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }
  const date = new Date().toISOString().split('T')[0];
  const filename = `backup-${date}.db`;
  const tmpPath = join(tmpDir, filename);

  await db.backup(tmpPath, {
    progress({ totalPages, remainingPages }) {
      if (remainingPages % 100 === 0) {
        const pct = Math.round((1 - remainingPages / totalPages) * 100);
        console.log(`[Backup] Progreso: ${pct}%`);
      }
    },
  });

  console.log(`[Backup] Backup local creado: ${tmpPath}`);
  return tmpPath;
}

export async function uploadToR2(localPath, key) {
  if (!isBackupConfigured()) {
    throw new Error('R2 no está configurado. Verifica R2_ENDPOINT, R2_ACCESS_KEY_ID y R2_SECRET_ACCESS_KEY.');
  }

  const { bucket } = getConfig();
  const fileBuffer = readFileSync(localPath);
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: 'application/octet-stream',
  });

  await client.send(command);
  console.log(`[Backup] Subido a R2: ${key}`);
}

export async function cleanupOldBackups(retentionDays) {
  if (!isBackupConfigured()) return;

  const { bucket, retentionDays: defaultRetention } = getConfig();
  const days = retentionDays != null ? retentionDays : defaultRetention;
  const client = getS3Client();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'backup-',
  });

  const { Contents } = await client.send(listCommand);
  if (!Contents || Contents.length === 0) return;

  let deletedCount = 0;
  for (const obj of Contents) {
    const objDate = obj.Key.match(/backup-(\d{4}-\d{2}-\d{2})\.db/);
    if (objDate) {
      const fileDate = new Date(objDate[1] + 'T00:00:00Z');
      if (fileDate < cutoff) {
        const delCommand = new DeleteObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
        });
        await client.send(delCommand);
        deletedCount++;
        console.log(`[Backup] Eliminado backup antiguo: ${obj.Key}`);
      }
    }
  }
  if (deletedCount > 0) {
    console.log(`[Backup] Rotación completada: ${deletedCount} backup(s) eliminado(s) (retención: ${days} días)`);
  }
}

export async function runBackup(db, auditLogFn) {
  if (!isBackupConfigured()) {
    console.log('[Backup] R2 no configurado. Omitiendo backup automático.');
    return false;
  }

  const startTime = Date.now();
  console.log('[Backup] Iniciando respaldo automático...');

  try {
    const localPath = await backupDatabase(db);

    const key = basename(localPath);
    await uploadToR2(localPath, key);

    if (existsSync(localPath)) {
      unlinkSync(localPath);
      console.log(`[Backup] Archivo temporal eliminado: ${localPath}`);
    }

    await cleanupOldBackups();

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Backup] Respaldo completado en ${elapsed}s`);

    if (auditLogFn) {
      auditLogFn(null, 'Sistema', 'Realizó Backup Automático', 'Backup', key);
    }
    return true;
  } catch (error) {
    console.error('[Backup] Error en respaldo automático:', error.message);
    if (auditLogFn) {
      auditLogFn(null, 'Sistema', 'Falló Backup Automático', 'Backup', error.message);
    }
    return false;
  }
}

function msUntilNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

export function startBackupScheduler(db, auditLogFn) {
  if (!isBackupConfigured()) {
    console.log('[Backup] R2 no configurado. El scheduler de backup automático no se iniciará.');
    return;
  }

  if (schedulerTimer) {
    console.log('[Backup] El scheduler ya está en ejecución. Omitiendo inicio duplicado.');
    return;
  }

  const { intervalHours } = getConfig();
  const intervalMs = intervalHours * 60 * 60 * 1000;
  const delayMs = msUntilNextMidnight();
  const delayMin = Math.round(delayMs / 60000);

  const now = new Date();
  const nextRun = new Date(now.getTime() + delayMs);
  const nextRunStr = nextRun.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

  console.log(`[Backup] Scheduler iniciado. Primer backup a las ${nextRunStr} (en ${delayMin} min). Intervalo: cada ${intervalHours}h`);

  const run = () => runBackup(db, auditLogFn);

  schedulerTimer = setTimeout(() => {
    run();
    schedulerTimer = setInterval(run, intervalMs);
  }, delayMs);

  return { intervalMs, delayMs };
}

export async function listBackups() {
  if (!isBackupConfigured()) return [];

  const { bucket } = getConfig();
  const client = getS3Client();
  const listCommand = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'backup-',
  });

  const { Contents } = await client.send(listCommand);
  if (!Contents || Contents.length === 0) return [];

  return Contents
    .filter(obj => obj.Key.match(/backup-(\d{4}-\d{2}-\d{2})\.db/))
    .map(obj => {
      const match = obj.Key.match(/backup-(\d{4}-\d{2}-\d{2})\.db/);
      return {
        key: obj.Key,
        date: match[1],
        size: obj.Size,
        lastModified: obj.LastModified,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function getBackupStream(key) {
  if (!isBackupConfigured()) {
    throw new Error('R2 no está configurado.');
  }

  const { bucket } = getConfig();
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  return {
    body: response.Body,
    contentLength: response.ContentLength,
    contentType: response.ContentType,
  };
}
