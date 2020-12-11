import LanguageService from "../LanguageService/LanguageService.js";
import constants from "../../../constants.js";

const pathToXsl = constants.XSL_PATH;
let errorMessage = "This is a valid product. However, more information about this product has not been published by the Pharmaceutical Company. Please check back later.";

export default class XmlDisplayService {
    constructor(dsuStorage, element, gtinSSI, xmlType, xmlFile, model) {
        this.languageService = new LanguageService(dsuStorage);
        this.DSUStorage = dsuStorage;
        this.element = element;
        this.gtinSSI = gtinSSI;
        this.xmlType = xmlType;
        this.xmlFile = xmlFile;
        this.model = model;
    }

    displayXml(language) {
        if (typeof language !== "undefined") {
            return this.displayXmlForLanguage(language);
        }

        // this.registerAvailableLanguages(err => {
            this.languageService.getWorkingLanguages((err, workingLanguages) => {
                const searchForLeaflet = (languages) => {
                    const languageCode = languages.shift().value;
                    this.readXmlFile(languageCode, (err, xmlContent, pathBase) => {
                        if (err) {
                            searchForLeaflet(languages);
                        } else {
                            this.applyStylesheetAndDisplayXml(pathBase, xmlContent);
                        }
                    });
                }

                searchForLeaflet(workingLanguages);
            })
        // });
    }

    populateModel(){
        this.registerAvailableLanguages((err) => {
            this.languageService.getLanguageListForSelect((err, languages) => {
                if (languages.length >= 2) {
                    this.createLanguageSelector(languages);
                    this.model.onChange("languages.value", () => {
                        this.displayXmlForLanguage(this.model.languages.value);
                    })
                }
                this.displayXml();
            })
        })
    }

    createLanguageSelector(languages) {
        this.model.twoOrMoreLanguages = true;
        this.model.languages = {
            placeholder: languages[0].label,
            options: languages
        }
    }

    displayXmlForLanguage(language) {
        this.readXmlFile(language,(err, xmlContent, pathBase) => {
            if (err) {
                let errorMessageElement = this.getErrorMessageElement(errorMessage)
                this.element.querySelector("#content").appendChild(errorMessageElement);
                return;
            }

            this.applyStylesheetAndDisplayXml(pathBase, xmlContent);
        });
    }

    readXmlFile(language, callback) {
        this.buildBasePath(language, (err, pathBase) => {
            const pathToXml = pathBase + this.xmlFile;

            this.readFileAndDecodeContent(pathToXml, (err, xmlContent) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, xmlContent, pathBase);
            })
        })
    }

    applyStylesheetAndDisplayXml(pathBase, xmlContent) {
        this.readFileAndDecodeContent(pathToXsl, (err, xslContent) => {
            if (err) {
                let errorMessageElement = this.getErrorMessageElement(errorMessage)
                this.element.querySelector("#content").appendChild(errorMessageElement);
                return;
            }
            this.displayXmlContent(pathBase, xmlContent, xslContent);
        });
    }

    displayXmlContent(pathBase, xmlContent, xslContent) {
        let xsltProcessor = new XSLTProcessor();
        xsltProcessor.setParameter(null, "resources_path", "/download" + pathBase);
        let parser = new DOMParser();

        let xmlDoc = parser.parseFromString(xmlContent, "text/xml");
        let xslDoc = parser.parseFromString(xslContent, "text/xml");

        xsltProcessor.importStylesheet(xslDoc);

        let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
        this.element.querySelector("#content").innerHTML = '';
        this.element.querySelector("#content").appendChild(resultDocument)
    }

    buildBasePath(language, callback) {
        this.DSUStorage.getObject(`/packages/${this.gtinSSI}/batch/batch.json`, (err, batchData) => {
            callback(undefined, `/packages/${this.gtinSSI}/batch/product/${batchData.version}/${this.xmlType}/${language}/`);
        });
    }

    getErrorMessageElement(errorMessage) {
        let pskLabel = document.createElement("psk-label");
        pskLabel.className = "scan-error-message";
        pskLabel.label = errorMessage;
        return pskLabel;
    }

    readFileAndDecodeContent(path, callback) {
        this.DSUStorage.getItem(path, (err, content) => {
            if (err) {
                return callback(err);
            }
            let textDecoder = new TextDecoder("utf-8");
            callback(undefined, textDecoder.decode(content));
        })
    }

    getAvailableLanguagesForXmlType(callback) {
        this.DSUStorage.getObject(`/packages/${this.gtinSSI}/batch/batch.json`, (err, batchData) => {
            let pathBase = `/packages/${this.gtinSSI}/batch/product/${batchData.version}/${this.xmlType}/`;
            this.DSUStorage.call("listFolders", pathBase, (err, languages) => {
                callback(undefined, languages);
            })
        });
    }

    registerLanguages(languages, callback) {
        this.languageService.registerWorkingLanguages(languages, callback);
    }

    registerAvailableLanguages(callback) {
        this.getAvailableLanguagesForXmlType((err, languages) => {
            this.registerLanguages(languages, callback);
        });
    }
}
