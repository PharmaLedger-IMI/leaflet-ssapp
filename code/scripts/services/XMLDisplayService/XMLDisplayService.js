import LanguageService from "../LanguageService/LanguageService.js";
import constants from "../../../constants.js";
import utils from "../../../utils.js";

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

    this.languageService.getWorkingLanguages((err, workingLanguages) => {
      const searchForLeaflet = (languages) => {
        if (languages.length === 0) {
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

  async isXmlAvailable() {
    return new Promise((resolve, reject) => {
      this.getAvailableLanguagesForXmlType((err, languages) => {
        if (err) {
          return reject(err);
        }
        if (this.xmlType === "smpc" && languages.length > 0) {
          this.model.showSmpc = true;
        }
        if (this.xmlType === "leaflet" && languages.length > 0) {
          this.model.showLeaflet = true;
        }
        return resolve(this.model.showSmpc || this.model.showLeaflet);
      });
    })

  }


/*
  populateModel() {
    this.getAvailableLanguagesForXmlType((err, languages) => {
      this.languageService.addWorkingLanguages(languages, (err) => {
        if (languages.length >= 2) {
          this.languageService.getLanguagesForSelect(languages, (err, languagesForSelect) => {
            if (err) {
              return;
            }
            this.createLanguageSelector(languagesForSelect);
            this.model.onChange("languages.value", () => {
              this.displayXmlForLanguage(this.model.languages.value);
            })
          });
        }
        this.displayXml();
        return;
      });
    })
  }
*/

/*  createLanguageSelector(languages) {
    this.model.twoOrMoreLanguages = true;
    this.model.languages = {
      value: languages[0].value,
      options: languages
    }
  }*/

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
      let pathToLeafletLanguage = `${pathBase}/${language}`;
      const pathToXml = `${pathToLeafletLanguage}/${this.xmlFile}`;
      const openDSU = require("opendsu");
      const resolver = openDSU.loadAPI("resolver");
      resolver.loadDSU(this.gtinSSI, async (err, dsu) => {
        if (err) {
          return callback(err);
        }
        try {
          let files = await $$.promisify(dsu.listFiles)(pathToLeafletLanguage);
          let xmlContent = await $$.promisify(dsu.readFile)(pathToXml);
          let textDecoder = new TextDecoder("utf-8");
          this.images = {};
          let anyOtherFiles = files.filter((file) => !file.endsWith('.xml'));
          for (let i = 0; i < anyOtherFiles.length; i++) {
            let filePath = `${pathToLeafletLanguage}/${anyOtherFiles[i]}`;
            let imgFile = await $$.promisify(dsu.readFile)(filePath);
            this.images[filePath] = utils.getImageAsBase64(imgFile);
          }
          callback(undefined, textDecoder.decode(xmlContent), `${pathToLeafletLanguage}/`);
        } catch (e) {
          return callback(e);
        }
      })

    })
  }

/*  readFileAndDecodeContent(path, dsu, callback) {
    dsu.readFile(path, (err, content) => {
      if (err) {
        return callback(err);
      }
      let textDecoder = new TextDecoder("utf-8");
      callback(undefined, textDecoder.decode(content));
    })

  }*/

  applyStylesheetAndDisplayXml(pathBase, xmlContent) {
    this.readXSLTFile((err, xslContent) => {
      if (err) {
        this.displayError();
        return;
      }
      this.displayXmlContent(pathBase, xmlContent, xslContent);
    });
  }

  displayError() {
    let errorMessageElement = this.getErrorMessageElement(errorMessage)
    this.element.querySelector("#leaflet-content").appendChild(errorMessageElement);
  }

  displayXmlContent(pathBase, xmlContent, xslContent) {
    let xsltProcessor = new XSLTProcessor();
    xsltProcessor.setParameter(null, "resources_path", pathBase);
    let parser = new DOMParser();

    let xmlDoc = parser.parseFromString(xmlContent, "text/xml");

    let xslDoc = parser.parseFromString(xslContent, "text/xml");

    xsltProcessor.importStylesheet(xslDoc);

    let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
    let sectionsElements = resultDocument.querySelectorAll(".leaflet-accordion-item");
    let leafletImages = resultDocument.querySelectorAll("img");
    for (let image of leafletImages) {
      image.setAttribute("src", this.images[image.getAttribute("src")]);
    }
    let aboutContent = "";
    let beforeContent = "";
    let howToContent = "";
    let sideEffectsContent = "";
    let storingContent = "";
    let moreContent = "";
    sectionsElements.forEach(section => {
      let xmlCodeValue = section.getAttribute("sectionCode");
      switch (xmlCodeValue) {
        case '48780-1':
        case '34089-3':
        case '34076-0':
        case '60559-2':
          aboutContent = aboutContent + section.innerHTML;
          break;
        case '34070-3':
        case '34084-4':
        case '34086-9':
        case '69759-9':
          beforeContent = beforeContent + section.innerHTML;
          break;
        case '34068-7':
        case '43678-2':
        case '34072-9':
        case '34067-9':
        case '59845-8':
          howToContent = howToContent + section.innerHTML;
          break;
        case '34071-1':
        case '43685-7':
        case '54433-8':
        case '69762-3':
        case '34077-8':
        case '60563-4':
        case '34078-6':
          sideEffectsContent = sideEffectsContent + section.innerHTML;
          break;
        case '44425-7':
          storingContent = storingContent + section.innerHTML;
          break;
        default:
          moreContent = moreContent + section.innerHTML;

      }
    });

    let htmlFragment = ` 
                <leaflet-section active label="${this.model.aboutLabel}" ref="about" icon="./assets/icons/leaflet-about.svg">${aboutContent}
                </leaflet-section>
                <leaflet-section active label="${this.model.beforeTakingLabel}" ref="before-taking" icon="./assets/icons/leaflet-before-taking.svg">${beforeContent}
                </leaflet-section>
                <leaflet-section active label="${this.model.howToLabel}" ref="how-to-take" icon="./assets/icons/leaflet-how-to-take.svg">${howToContent}
                </leaflet-section>
                <leaflet-section active label="${this.model.sideEffectsLabel}" ref="side-effects" icon="./assets/icons/leaflet-side-effects.svg">${sideEffectsContent}
                </leaflet-section>
                <leaflet-section active label="${this.model.storingLabel}" ref="storing" icon="./assets/icons/leaflet-storing.svg">${storingContent}
                </leaflet-section>
                <leaflet-section active label="${this.model.moreLabel}" ref="more" icon="./assets/icons/leaflet-more.svg">${moreContent}
                </leaflet-section>`
    this.element.querySelector("#leaflet-content").innerHTML = htmlFragment;
    let leafletLinks =  this.element.querySelectorAll(".leaflet-link");
    for (let link of leafletLinks) {
      let linkUrl = link.getAttribute("linkUrl");
      if (linkUrl.slice(0, 1) === "#") {
        link.addEventListener("click", () => {
          console.log('linkUrl', linkUrl);
          document.getElementById(linkUrl.slice(1)).scrollIntoView();
        });
      }
    }
  }

  buildBasePath(callback) {
    let batchBasePath = `${constants.PATH_TO_BATCH_DSU}${this.xmlType}`;
    const openDSU = require("opendsu");
    const resolver = openDSU.loadAPI("resolver");
    resolver.loadDSU(this.gtinSSI, (err, dsu) => {
      if (err) {
        return callback(err);
      }
      dsu.listFolders(batchBasePath, (err, files) => {
        if (err) {
          return callback(err);
        }
        if (files.length > 0) {
          return callback(undefined, batchBasePath);
        }
        let pathBase = `${constants.PATH_TO_PRODUCT_DSU}${this.xmlType}`;
        callback(undefined, pathBase);
      })
    })
  }


  getErrorMessageElement(errorMessage) {
    let pskLabel = document.createElement("psk-label");
    pskLabel.className = "scan-error-message";
    pskLabel.label = errorMessage;
    return pskLabel;
  }

  readXSLTFile(callback) {
    this.DSUStorage.getItem(constants.XSL_PATH, (err, content) => {
      if (err) {
        return callback(err);
      }
      let textDecoder = new TextDecoder("utf-8");
      callback(undefined, textDecoder.decode(content));
    })
  }

  getAvailableLanguagesForXmlType(callback) {
    this.buildBasePath((err, pathBase) => {
      const openDSU = require("opendsu");
      const resolver = openDSU.loadAPI("resolver");
      resolver.loadDSU(this.gtinSSI, (err, dsu) => {
        if (err) {
          return callback(err);
        }
        dsu.listFolders(pathBase, (err, languages) => {
          if (err) {
            return callback(err);
          }
          callback(undefined, this.languageService.normalizeLanguages(languages));
        })
      })
    });
  }

/*  registerLanguages(languages, callback) {
    this.languageService.addWorkingLanguages(languages, callback);
  }*/

/*  registerAvailableLanguages(callback) {
    this.getAvailableLanguagesForXmlType((err, languages) => {
      this.registerLanguages(languages, callback);
    });
  }*/
}
