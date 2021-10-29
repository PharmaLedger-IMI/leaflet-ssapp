const APPLICATION_IDENTIFIERS = {
  "01": {
    type: "gtin",
    fixedLength: 14
  },
  "10": {
    type: "batchNumber",
    fixedLength: false,
    maxLength: 20
  },
  "11": {
    type: "productionDate",
    fixedLength: 6
  },
  "15": {
    type: "bestBeforeDate",
    fixedLength: 6
  },
  "17": {
    type: "expirationDate",
    fixedLength: 6
  },
  "21": {
    type: "serialNumber",
    fixedLength: false,
    maxLength: 20
  }
}

function parse(gs1String) {
  const components = {};

  function __parseRecursively(_gs1String) {
    if (_gs1String.length === 0) {
      return components;
    }
    const {ai, newGs1String} = extractFirstAI(_gs1String);
    return __parseRecursively(populateComponents(components, newGs1String, ai));
  }

  return __parseRecursively(gs1String);
}

function extractFirstAI(gs1String) {
  let ai;
  let newGs1String;
  if (gs1String.startsWith("(")) {
    const endIndex = gs1String.indexOf(')');
    ai = gs1String.substring(1, endIndex);
    newGs1String = gs1String.substring(endIndex + 1);
  } else {
    ai = gs1String.slice(0, 2);
    let i = 2;
    while (typeof APPLICATION_IDENTIFIERS[ai] === "undefined" && ai.length < 4) {
      ai += gs1String[i];
      i++;
    }

    newGs1String = gs1String.substring(i);
  }

  return {ai, newGs1String}
}

function populateComponents(components, gs1String, ai) {
  let aiObj = APPLICATION_IDENTIFIERS[ai];
  if (typeof aiObj === "undefined") {
    throw Error(`Invalid application identifier ${ai}. Have you registered it in the APPLICATION_IDENTIFIERS dictionary?`);
  }
  if (aiObj.fixedLength) {
    components[aiObj.type] = gs1String.substring(0, aiObj.fixedLength);
    return gs1String.substring(aiObj.fixedLength);
  } else {
    components[aiObj.type] = "";
    let len = Math.min(aiObj.maxLength, gs1String.length);
    for (let i = 0; i < len; i++) {
      if (gs1String[i] === '(') {
        return gs1String.substring(i);
      }
      components[aiObj.type] += gs1String[i];
    }

    return gs1String.substring(len);
  }
}

const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * converts date from ISO (YYYY-MM-DD) to YYYY-HM, where HM comes from human name for the month, i.e. 2021-DECEMBER
 * @param {string} dateString
 */
function convertFromISOtoYYYY_HM(dateString, useFullMonthName, separator) {
  const splitDate = dateString.split('-');
  const month = parseInt(splitDate[1]);
  let separatorString = "-";
  if (typeof separator !== "undefined") {
    separatorString = separator;
  }
  if (useFullMonthName) {
    return `${splitDate[2]} ${separatorString} ${monthNames[month - 1]} ${separatorString} ${splitDate[0]}`;
  }
  return `${splitDate[2]} ${separatorString} ${monthNames[month - 1].slice(0, 3)} ${separatorString} ${splitDate[0]}`;
}

function convertFromGS1DateToYYYY_HM(gs1DateString) {
  let year = "20" + gs1DateString.slice(0, 2);
  let month = gs1DateString.slice(2, 4);
  let day = gs1DateString.slice(4);
  return `${day} - ${monthNames[month - 1].slice(0, 3)} - ${year}`
}

function getTimeSince(date) {

  let seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let month = new Date(date).getMonth() + 1;
  let monthSeconds = 31 * 24 * 60 * 60;
  if (month === 2) {
    monthSeconds = 28 * 24 * 60 * 60;
  }
  if ([4, 6, 9, 11].includes(month)) {
    monthSeconds = 30 * 24 * 60 * 60;
  }

  if (seconds > monthSeconds) {
    return
  }
  let interval = seconds / (24 * 60 * 60);
  if (interval > 1) {
    return Math.floor(interval) + " days";
  }
  interval = seconds / (60 * 60);
  if (interval > 1) {
    return Math.floor(interval) + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes";
  }
  return seconds + (seconds > 1 ? " seconds" : " second");
}

function getDateForDisplay(date) {
  if (date.slice(0, 2) === "00") {
    return date.slice(5);
  }
  return date;
}

//convert date to last date of the month for 00 date
function convertToLastMonthDay(date) {
  let expireDateConverted = date.replace("00", "01");
  expireDateConverted = new Date(expireDateConverted.replaceAll(' ', ''));
  expireDateConverted.setFullYear(expireDateConverted.getFullYear(), expireDateConverted.getMonth() + 1, 0);
  expireDateConverted = expireDateConverted.getTime();
  return expireDateConverted;
}

function getFetchUrl(relativePath) {
  if (window["$$"] && $$.SSAPP_CONTEXT && $$.SSAPP_CONTEXT.BASE_URL && $$.SSAPP_CONTEXT.SEED) {
    // if we have a BASE_URL then we prefix the fetch url with BASE_URL
    return `${new URL($$.SSAPP_CONTEXT.BASE_URL).pathname}${
      relativePath.indexOf("/") === 0 ? relativePath.substring(1) : relativePath
    }`;
  }
  return relativePath;
}

function getRecordPKey(gtinSSI, gs1Fields) {
  if (typeof gtinSSI !== "string") {
    gtinSSI = gtinSSI.getIdentifier();
  }
  return `${gtinSSI}${gs1Fields.serialNumber}|${gs1Fields.expiry}`;
}


const bytesToBase64 = (bytes) => {
  const base64abc = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
    "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "/"
  ];

  let result = '', i, l = bytes.length;
  for (i = 2; i < l; i += 3) {
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[((bytes[i - 1] & 0x0F) << 2) | (bytes[i] >> 6)];
    result += base64abc[bytes[i] & 0x3F];
  }
  if (i === l + 1) { // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[(bytes[i - 2] & 0x03) << 4];
    result += "==";
  }
  if (i === l) { // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2];
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)];
    result += base64abc[(bytes[i - 1] & 0x0F) << 2];
    result += "=";
  }
  return result;
}

function getImageAsBase64(imageData) {
  if (typeof imageData === "string") {
    return imageData;
  }
  if (!(imageData instanceof Uint8Array)) {
    imageData = new Uint8Array(imageData);
  }
  let base64Image = bytesToBase64(imageData);
  base64Image = `data:image/png;base64, ${base64Image}`;
  return base64Image;
}

export default {
  convertFromISOtoYYYY_HM,
  convertFromGS1DateToYYYY_HM,
  getFetchUrl,
  getRecordPKey,
  getDateForDisplay,
  convertToLastMonthDay,
  getImageAsBase64,
  getTimeSince
};
