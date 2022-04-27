const G_PUSHED_STATUS = '送信済';
const G_MESSAGE_COLUMN = 0;
const G_DATETIME_COLUMN = 1;
const G_STATUS_COLUMN = 2;

const main = () => {
    const DB_SHEET_ID = "";
    const DB_SHEET_NAME = "";
    const GOOGLE_CHAT_URL = "";

    const sheet = SpreadsheetApp.openById(DB_SHEET_ID).getSheetByName(DB_SHEET_NAME);

    const pushableMessages = getPushableMessages(sheet);
    console.log(pushableMessages);

    pushAndSaveDb(sheet, pushableMessages, GOOGLE_CHAT_URL);
}

const getPushableMessages = (sheet) =>  {
    const unPushed = (v) => {
        return v['status'] !== G_PUSHED_STATUS;
    };

    const beyondTime = (v) => {
        const now = new Date();
        return v['datetime'] <= now;
    };

    let allMessages = [];
    const allRows = sheet.getDataRange().getValues();
    allRows.forEach((row, i) => {
        allMessages.push({
            id: i + 1,
            message: row[G_MESSAGE_COLUMN],
            datetime: row[G_DATETIME_COLUMN],
            status: row[G_STATUS_COLUMN]
        });
    });

    const pushableMessages = allMessages.filter(unPushed).filter(beyondTime);

    return pushableMessages;
}

const pushAndSaveDb = (sheet, rows, googleChatUrl) => {
    const notification = (url, message) => {
        const payload = {
            'text' : message
        };

        const options = {
            'payload' : JSON.stringify(payload),
            'myamethod' : 'POST',
            'contentType' : 'application/json'
        };

        UrlFetchApp.fetch(url, options);
    }

    rows.forEach((row) => {
        notification(googleChatUrl, row.message);
        sheet.getRange(row.id, G_STATUS_COLUMN + 1).setValue(G_PUSHED_STATUS);
    });
}
