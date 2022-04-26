const main = () => {
    // 対象とするGoogle Drive
    const TARGET_FOLDER_ID = "";
    const DRIVE = DriveApp.getFolderById(TARGET_FOLDER_ID);

    // DBスプレッドシート
    const DB_SHEET_ID = "";
    const DB_SHEET_NAME = "";
    const SHEET = SpreadsheetApp.openById(DB_SHEET_ID).getSheetByName(DB_SHEET_NAME);

    // LINE
    const LINE_URL = "https://notify-api.line.me/api/notify";
    const LINE_TOKEN = "";

    // Driveに保存されたデータを取得
    const driveData = getDriveData(DRIVE);

    // DBに保存されたデータを取得
    const dbData = getDbData(SHEET);

    // DriveとDBを比較し前バッチ後に更新されたデータを取得
    const updatedData = getUpdatedData(driveData, dbData, DB_SHEET_ID, SHEET);

    // 更新されたファイル・フォルダ情報を通知
    notification(updatedData, LINE_TOKEN, LINE_URL);
}

// Drive内を再帰的に探索してすべてのファイルIDを配列にして返す
const getDriveData = (drive) => {
    let driveData = {};

    const getAllFilesId = (drive) => {
        let filesIdList = [];

        const files = drive.getFiles();
        while(files.hasNext()){
          filesIdList.push(files.next().getId());
        }

        const childFolders = drive.getFolders();
        while(childFolders.hasNext()){
            const child_folder = childFolders.next();
            filesIdList = filesIdList.concat( getAllFilesId(child_folder) );
        }

        return filesIdList;
    }

    const allFilesId = getAllFilesId(drive);
    allFilesId.forEach(id => {
            const file = DriveApp.getFileById(id);
            driveData[file.getName()] = {lastUpdate : file.getLastUpdated(), fileId: file.getId()};
        }
    );

    return driveData;
}

// DB変わりに使用しているスプレッドシートからデータを取得する
const getDbData = (sheet) =>  {
    let dbData = {};

    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      dbData[data[i][0]] = {name : data[i][0], lastUpdate : data[i][1], rowNo : i + 1};
    }

    return dbData;
}

const getUpdatedData = (driveData, dbData, dbSheetId, sheet) => {
    let updatedData = [];

    for (key in driveData) {
      if( dbSheetId == driveData[key].fileId ){
        continue;
      }

      if(key in dbData) {
        // フォルダ名がシートに存在する場合
        if(driveData[key].lastUpdate > dbData[key].lastUpdate) {
          // フォルダが更新されている場合
          sheet.getRange(dbData[key].rowNo, 2).setValue(driveData[key].lastUpdate);
          sheet.getRange(dbData[key].rowNo, 3).setValue(driveData[key].fileId);
          updatedData.push({filename:key, lastUpdate:driveData[key].lastUpdate, fileId:driveData[key].fileId});
        }
      } else {
        // フォルダ名がシートに存在しない場合
        const newRow = sheet.getLastRow() + 1;
        sheet.getRange(newRow, 1).setValue(key);
        sheet.getRange(newRow, 2).setValue(driveData[key].lastUpdate);
        sheet.getRange(newRow, 3).setValue(driveData[key].fileId);
        updatedData.push({filename:key, lastUpdate:driveData[key].lastUpdate, fileId:driveData[key].fileId});
      }
    }

    return updatedData;
}

// LINE通知
const notification = (updatedData, lineToken, lineUrl) => {
    let updateText = "";

    for( key in updatedData ) {
      const item = updatedData[key];
      updateText += "\n\n" + item.filename + "\n" + DriveApp.getFileById(item.fileId).getUrl()
    }

    const notifyToLine = (message, token, url) => {
      const options = {
        "method" : "post",
        "headers" : {
          "Authorization" : "Bearer "+ token
        },
        "payload" : {
          "message" : message
        }
      }

      UrlFetchApp.fetch(url, options);
    }

    if (updateText) {
      console.log(updateText);
      notifyToLine('以下のファイルが回覧にアップロードされました確認してください' + updateText, lineToken, lineUrl);
    }
}
