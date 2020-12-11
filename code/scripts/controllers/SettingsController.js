import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";
import LanguageService from "../services/LanguageService/LanguageService.js";
import languageServiceUtils from "../services/LanguageService/languageServiceUtils.js";

export default class SettingsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({languageSelectorOpened: false});
        this.languageService = new LanguageService(this.DSUStorage);
        this.languageService.getLanguageListForOrdering((err, vm) => {
            this.model.workingLanguages = vm;

            this.model.onChange("languages", (event)=>{
                this.languageService.saveWorkingLanguages(this.model.workingLanguages.items, (err)=>{
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
            this.languageService.registerWorkingLanguages(this.model.languagesToAdd.value, (err)=>{
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
