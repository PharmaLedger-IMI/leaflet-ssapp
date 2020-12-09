import ContainerController from "../../cardinal/controllers/base-controllers/ContainerController.js";

export default class SettingsController extends ContainerController {
    constructor(element, history) {
        super(element, history);
        this.setModel({
            languageListModel: {
                items: [
                    {
                        label: "Romanian",
                        value: "ro",
                        selected: true
                    },
                    {
                        label: "English",
                        value: "en"
                    },
                    {
                        label: "German",
                        value: "de"
                    }
                ]
            }
        });
    }
}
