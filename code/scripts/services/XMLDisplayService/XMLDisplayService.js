import LanguageService from "../LanguageService/LanguageService.js";
import constants from "../../../constants.js";

const pathToXsl = constants.XSL_PATH;
let errorMessage = "This is a valid product. However, more information about this product has not been published by the Pharmaceutical Company. Please check back later.";

export default class XmlDisplayService {
    constructor(dsuStorage, element, gtinSSI, basePath, xmlType, xmlFile, model) {
        this.languageService = new LanguageService(dsuStorage);
        this.DSUStorage = dsuStorage;
        this.element = element;
        this.gtinSSI = gtinSSI;
        this.xmlType = xmlType;
        this.xmlFile = xmlFile;
        this.model = model;
        this.basePath = basePath;
    }

    displayXml(language) {
        if (typeof language !== "undefined") {
            return this.displayXmlForLanguage(language);
        }

        this.languageService.getWorkingLanguages((err, workingLanguages) => {
            const searchForLeaflet = (languages) => {
                if(languages.length === 0) {
                    this.displayError();
                    return;
                }
                const languageCode = languages.shift().value;
                this.readXmlFile(languageCode, (err, xmlContent, pathBase) => {
                    if (err) {
                        searchForLeaflet(languages);
                    } else {
                        return this.applyStylesheetAndDisplayXml(pathBase, xmlContent);
                    }
                });
            }
            searchForLeaflet(workingLanguages);
        })
    }

    isXmlAvailable() {
        this.getAvailableLanguagesForXmlType((err, languages) => {
            if (this.xmlType === "smpc" && languages.length > 0) {
                this.model.showSmpc = true;
                this.model.epiColumns++;
            }
            if (this.xmlType === "leaflet" && languages.length > 0) {
                this.model.showLeaflet = true;
                this.model.epiColumns++;
            }
        });
    }


    populateModel() {
        this.getAvailableLanguagesForXmlType((err, languages) => {
            this.languageService.addWorkingLanguages(languages, (err) => {
                if (languages.length >= 2) {
                    this.languageService.getLanguagesForSelect(languages, (err, languagesForSelect) => {
                        if (err) {
                            return callback(err);
                        }
                        this.createLanguageSelector(languagesForSelect);
                        this.model.onChange("languages.value", () => {
                            this.displayXmlForLanguage(this.model.languages.value);
                        })
                    });
                }
                this.displayXml();
            });
        })
    }

    createLanguageSelector(languages) {
        this.model.twoOrMoreLanguages = true;
        this.model.languages = {
            value: languages[0].value,
            options: languages
        }
    }

    displayXmlForLanguage(language) {
        this.readXmlFile(language, (err, xmlContent, pathBase) => {
            if (err) {
                this.displayError();
                return;
            }

            this.applyStylesheetAndDisplayXml(pathBase, xmlContent);
        });
    }

    readXmlFile(language, callback) {
        this.buildBasePath((err, pathBase) => {
            const pathToLeafletLanguage = `${pathBase}${language}/`;
            const pathToXml = pathToLeafletLanguage + this.xmlFile;

            this.readFileAndDecodeContent(pathToXml, (err, xmlContent) => {
                if (err) {
                    return callback(err);
                }
                callback(undefined, xmlContent, pathToLeafletLanguage);
            })
        })
    }

    applyStylesheetAndDisplayXml(pathBase, xmlContent) {
        this.readFileAndDecodeContent(pathToXsl, (err, xslContent) => {
            if (err) {
                this.displayError();
                return;
            }
            this.displayXmlContent(pathBase, xmlContent, xslContent);
        });
    }

    displayError(){
        let errorMessageElement = this.getErrorMessageElement(errorMessage)
        this.element.querySelector("#content").appendChild(errorMessageElement);
    }

    displayXmlContent(pathBase, xmlContent, xslContent) {
        let xsltProcessor = new XSLTProcessor();
        xsltProcessor.setParameter(null, "resources_path", "download" + pathBase);
        let parser = new DOMParser();

        let xmlDoc = parser.parseFromString(xmlContent, "text/xml");
        let xslDoc = parser.parseFromString(xslContent, "text/xml");

        xsltProcessor.importStylesheet(xslDoc);

        let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
        this.element.querySelector("#content").innerHTML = '';
        this.element.querySelector("#content").appendChild(resultDocument)
    }

    buildBasePath(callback) {
        const pathToBatchDSU = `${this.basePath}${constants.PATH_TO_BATCH_DSU}`;
            let batchBasePath = `${pathToBatchDSU}${this.xmlType}/`;
            this.DSUStorage.call("listFolders", batchBasePath, (err, files) => {
                if (err) {
                    return callback(err);
                }
                if (files.length > 0) {
                    return callback(undefined, batchBasePath);
                }

                    const pathToProductDSU = `${this.basePath}${constants.PATH_TO_PRODUCT_DSU}`;
                    let pathBase = `${pathToProductDSU}${this.xmlType}/`;
                    callback(undefined, pathBase);
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
        this.buildBasePath((err, pathBase) => {
            this.DSUStorage.call("listFolders", pathBase, (err, languages) => {
                if (err) {
                    return callback(err);
                }

                callback(undefined, this.languageService.normalizeLanguages(languages));
            })
        });
    }

    registerLanguages(languages, callback) {
        this.languageService.addWorkingLanguages(languages, callback);
    }

    registerAvailableLanguages(callback) {
        this.getAvailableLanguagesForXmlType((err, languages) => {
            this.registerLanguages(languages, callback);
        });
    }
}
