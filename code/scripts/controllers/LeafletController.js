import ContainerController from '../../cardinal/controllers/base-controllers/ContainerController.js';
const pathBase = '/tmp/batch/product/';
const pathToXml = pathBase+'leaflet.xml';
const pathToXsl = '/code/assets/xml/leaflet.xsl';

export default class LeafletController extends ContainerController {
	constructor(element, history) {
		super(element, history);
		this.setModel({});
		this.displayLeaflet();
	}

	displayLeaflet(){
		this.DSUStorage.getItem(pathToXml, (err, content) => {
			let textDecoder = new TextDecoder("utf-8");
			const xmlContent = textDecoder.decode(content);

			this.DSUStorage.getItem(pathToXsl, (err, content) => {
				const xslContent = textDecoder.decode(content);
				let xsltProcessor = new XSLTProcessor();
				xsltProcessor.setParameter(null, "resources_path", "/download"+pathBase);
				let parser = new DOMParser();

				let xmlDoc = parser.parseFromString(xmlContent,"text/xml");
				let xslDoc = parser.parseFromString(xslContent,"text/xml");

				xsltProcessor.importStylesheet(xslDoc);

				let resultDocument = xsltProcessor.transformToFragment(xmlDoc, document);
				this.element.querySelector("#content").appendChild(resultDocument);
			});
		});
	}
}