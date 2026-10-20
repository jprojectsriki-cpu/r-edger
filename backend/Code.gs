/**
 * R-EDGER API - エントリポイント
 */

// シート名（スプレッドシートのタブ名と完全一致させる）
const SHEET_USERS = 'Users';

/**
 * GETリクエストの入口（今は動作確認用）
 */
function doGet(e) {
  return json_({ ok: true, message: 'R-EDGER API is running' });
}

/**
 * オブジェクトをJSONで返す共通関数
 */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 動作確認：Usersシートの見出し行を読み取ってログに出す
 */
function testUsersSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  if (!sheet) {
    throw new Error('Usersシートが見つかりません。シート名を確認してください。');
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  Logger.log('列数: ' + headers.length);
  Logger.log('見出し: ' + headers.join(', '));
}