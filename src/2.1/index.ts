import { IHelpers } from "../IHelpers"
import { Helpers } from "./Helpers"
import BcfParserBase from "../BcfParser"
import BcfProjectBase from "../BcfProject"

export * from "../schema"

const helpersFunctions: IHelpers = {
    GetMarkup: Helpers.GetMarkup,
    GetViewpoint: Helpers.GetViewpoint,
    XmlToJsonNotation: Helpers.XmlToJsonNotation,
    MarkupToXmlNotation: Helpers.MarkupToXmlNotation,
    RenameJsonKeys: Helpers.RenameJsonKeys,
    XmlParserOptions: Helpers.XmlParserOptions,
    XmlBuilderOptions: Helpers.XmlBuilderOptions
}

export class BcfReader extends BcfParserBase {
    constructor() {
        super("2.1", helpersFunctions)
    }
}

export class BcfWriter extends BcfParserBase {
    constructor() {
        super("2.1", helpersFunctions)
    }
}

export class BcfParser extends BcfParserBase {
    constructor() {
        super("2.1", helpersFunctions)
    }
}

export class BcfProject extends BcfProjectBase {
    constructor(projectName: string, projectId?: string) {
        super("2.1", new BcfParser, projectName, projectId)
    }
}