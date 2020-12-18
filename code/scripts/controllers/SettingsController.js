import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import LanguageService from "../services/LanguageService/LanguageService.js";
import languageServiceUtils from "../services/LanguageService/languageServiceUtils.js";

export default class SettingsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({languageSelectorOpened: false, origin: window.location.origin});
        this.languageService = new LanguageService(this.DSUStorage);
        this.languageService.getLanguageListForOrdering((err, vm) => {
            this.model.workingLanguages = vm;

            this.model.onChange("workingLanguages", (event) => {
                this.languageService.overwriteWorkingLanguages(this.model.workingLanguages.items, (err) => {
                    if (err) {
                        throw err;
                    }
                });
            });
        });
        this.model.languagesToAdd = {
            placeholder: "Select a language",
            options: languageServiceUtils.getAllLanguagesAsVMItems()
        }
        this.on("add-language", (event) => {
            this.model.languageSelectorOpened = true;
        });

        this.model.onChange("languagesToAdd", () => {
            this.languageService.addWorkingLanguages(this.model.languagesToAdd.value, (err) => {
                if (err) {
                    throw err;
                }
                this.languageService.getLanguageListForOrdering((err, vm) => {
                    this.model.workingLanguages = vm;
                    this.model.languageSelectorOpened = false;
                });
            })
        });
    }
}
