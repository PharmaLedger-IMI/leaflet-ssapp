function parse(gs1String) {
    const DATA_LENGTH = 6;
    const SN_LENGTH = 12;
    const BATCH_NUMBER_LENGTH = 6;

    gs1String = gs1String.replace(/[()]/g, '');
    const components = {};
    components.expiration = gs1String.substring(gs1String.length - DATA_LENGTH);
    components.batch = gs1String.substring(gs1String.length - DATA_LENGTH - BATCH_NUMBER_LENGTH - 2, gs1String.length - DATA_LENGTH - 2);
    components.serialNumber = gs1String.substring(gs1String.length - DATA_LENGTH - BATCH_NUMBER_LENGTH - SN_LENGTH - 4, gs1String.length - DATA_LENGTH - BATCH_NUMBER_LENGTH- 4);
    components.gtin = gs1String.substring(2, gs1String.length - DATA_LENGTH - BATCH_NUMBER_LENGTH - SN_LENGTH - 6);
    return components;
}

export default {parse};