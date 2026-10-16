// Google Apps Script — Webhook de correo (Logic Group Management)
// Versión ORIGINAL tal como la pegó Director Hermes desde script.google.com
// el 2026-10-16 (la que estaba desplegada). Se conserva solo como referencia
// histórica: NO usa el campo "cc" del JSON, por eso los Con Copia (CC)
// nunca llegaban. La versión vigente es doPost_corregido_CC.js.
//
// Nota: este script NO tiene doGet (al hacer GET responde
// "No se encontró la función doGet").

function doPost(e) {
  // Eliminamos el try/catch para forzar que los errores aparezcan en el log de ejecuciones
  var data = JSON.parse(e.postData.contents);
  var to = data.to;
  var subject = data.subject;
  var body = data.body;
  var attachments = [];

  if (data.attachments && data.attachments.length > 0) {
    data.attachments.forEach(function(att) {
      var bytes = Utilities.base64Decode(att.base64);
      var blob = Utilities.newBlob(bytes, att.type, att.name);
      attachments.push(blob);
    });
  }

  GmailApp.sendEmail(to, subject, body, {
    attachments: attachments,
    name: "Logic Group Management"
  });

  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}
