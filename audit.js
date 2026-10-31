const db = require('./db');
function audit(subject, endpoint, device, result, reason) {
  db.prepare('INSERT INTO audit_logs (at,subject,endpoint,device,result,reason) VALUES (?,?,?,?,?,?)')
    .run(new Date().toISOString(), subject || 'anonymous', endpoint, device || null, result, reason);
}
module.exports = audit;
