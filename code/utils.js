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
    function __parseRecursively(_gs1String){
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
        newGs1String = gs1String.substring(endIndex+1);
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
function convertFromISOtoYYYY_HM(dateString){
    const splitDate = dateString.split('-');
    const month = parseInt(splitDate[1]);
    return `${monthNames[month - 1]} - ${splitDate[0]}`;
}

function convertFromGS1DateToYYYY_HM(gs1DateString){
    let year = "20" + gs1DateString.slice(0, 2);
    let month = gs1DateString.slice(2, 4);
    return `${monthNames[month - 1]} - ${year}`
}
function getErrorMessageElement(errorMessage) {
    let pskLabel = document.createElement("psk-label");
    pskLabel.className = "scan-error-message";
    pskLabel.label = errorMessage;
    return pskLabel;
}

import Languages from "./scripts/models/Languages.js";
function displayXml(storage, element, xmlType, language, xmlFile) {
    const pathToXsl = '/code/assets/xml/leaflet.xsl';
    storage.call("listDSUs", "/packages", (err, packs) => {
        if (typeof this.packageIndex === "undefined") {
            this.packageIndex = packs.length - 1;
        }
        packs.sort((a, b) => parseInt(a.path) <= parseInt(b.path));
        let pack = packs[this.packageIndex].path;
        const languageCode = Languages.getCode(language);
        storage.getItem(`/packages/${pack}/batch/batch.json`, "json", (err, batchData) => {
            if (err) {
                console.log(err);
                return;
            }
            let pathBase = `/packages/${pack}/batch/product/${batchData.version}/${xmlType}/${languageCode}/`;
            const pathToXml = pathBase + xmlFile;

            storage.getItem(pathToXml, (err, content) => {
                if (err) {
                    let errorMessageElement = getErrorMessageElement("Product does not have this information")
                    element.querySelector("#content").appendChild(errorMessageElement);
                    return;
                }
                let textDecoder = new TextDecoder("utf-8");
                const xmlContent = textDecoder.decode(content);

                storage.getItem(pathToXsl, (err, content) => {
                    if (err) {
                        let errorMessageElement = getErrorMessageElement("Product does not have this information")
                        element.querySelector("#content").appendChild(errorMessageElement);
                        return;
                    }
                    const xslContent = textDecoder.decode(content);
                    let xsltProcessor = new XSLTProcessor();
                    xsltProcessor.setParameter(null, "resources_path", "/download" + pathBase);
                    let parser = new DOMParser();

                    let xmlDoc = parser.parseFromString(xmlContent, "text/xml");
                    let xslDoc = parser.parseFromString(xslContent, "text/xml");

                    xsltProcessor.importStylesheet(xslDoc);

                    let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
                    element.querySelector("#content").appendChild(resultDocument);
                });
            });
        });
    });
}
export default {
    convertFromISOtoYYYY_HM,
    convertFromGS1DateToYYYY_HM,
    displayXml
};