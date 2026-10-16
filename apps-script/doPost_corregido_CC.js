// Google Apps Script — Webhook de correo (Logic Group Management)
// Versión corregida: soporte para Con Copia (CC) y cuerpo HTML (firmas).
// Pega este código en el editor de script.google.com (Archivo > Código.gs),
// guarda e implementa (Implementar > Administrar implementaciones > Editar >
// Versión: Nueva versión > Implementar). La URL del webhook NO cambia.
//
// Arreglos incluidos:
//  - El campo "cc" que el servidor envía en el JSON era ignorado (los Con Copia
//    no llegaban).
//  - El campo "htmlBody" (cuerpo con la firma HTML del asistente) ahora se usa
//    cuando está presente; si no, se mantiene el "body" de texto plano.
//
// Última actualización: 2026-10-16 (validado por Director Hermes).

function doPost(e) {
  // Eliminamos el try/catch para forzar que los errores aparezcan en el log de ejecuciones
  var data = JSON.parse(e.postData.contents);
  var to = data.to;
  var cc = data.cc || ''; // Con Copia (CC) del modal de envío
  var subject = data.subject;
  var body = data.body;
  var htmlBody = data.htmlBody || ''; // cuerpo con firma HTML (opcional)
  var attachments = [];

  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach(function(att) {
      var bytes = Utilities.base64Decode(att.base64);
      var blob = Utilities.newBlob(bytes, att.type, att.name);
      attachments.push(blob);
    });
  }

  var options = {
    attachments: attachments,
    name: "Logic Group Management"
  };
  if (cc) options.cc = cc; // solo se pasa cuando el campo CC tiene destinatarios
  if (htmlBody) options.htmlBody = htmlBody; // solo se pasa cuando hay firma HTML

  GmailApp.sendEmail(to, subject, body, options);

  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
