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

export default {parse};