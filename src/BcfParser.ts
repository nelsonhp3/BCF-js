import { IViewPoint, ITopic, VisualizationInfo, IHeader, IMarkup } from "./schema"
import { IHelpers } from "./IHelpers"
import { Reader, TypedArray, unzip, ZipEntry, ZipInfo } from 'unzipit'
import { IExtensionsSchema, IProject } from "./schema/project"
import { XMLBuilder, XMLParser } from "fast-xml-parser"
import JSZip from "jszip"
import { generateUUID } from "./SharedHelpers"
import BcfProject from "./BcfProject"

//TODO: Fix .bcfv creator
//TODO: Fix extensions creator
//TODO: Update or downgrade project version
//TODO: Fix file entries logic

export default class BcfParser {

    version: string
    bcf_archive: ZipInfo | undefined
    files: any[]
    project: BcfProject
    markups: Markup[] = []
    helpers: IHelpers

    constructor(version: string, helpers: IHelpers, project?: BcfProject) {
        this.version = version
        this.helpers = helpers
        this.project = project ?? new BcfProject(this.version, this, 'Blank Project')
        this.files = []
    }

    //#region unzipit to import .bcf file
    read = async (src: string | ArrayBuffer | TypedArray | Blob | Reader) => {
        try {
            const markups: ZipEntry[] = []

            this.bcf_archive = await unzip(src)

            const { entries } = this.bcf_archive

            let projectId: string = ''
            let projectName: string = ''
            let projectVersion: string = ''
            let extension_schema: IExtensionsSchema | undefined

            for (const [name, entry] of Object.entries(entries)) {

                //TODO: Change this logic to handle file changes
                if (name.endsWith('.bcf')) {
                    markups.push(entry)
                }

                else if (name.endsWith('.version')) {
                    const parsedEntry = new XMLParser(this.helpers.XmlParserOptions).parse(await entry.text())
                    projectVersion = parsedEntry.Version.DetailedVersion
                }

                else if (name.endsWith('.bcfp')) {
                    const parsedEntry = new XMLParser(this.helpers.XmlParserOptions).parse(await entry.text())

                    if (!parsedEntry.ProjectExtension || !parsedEntry.ProjectExtension.Project)
                        continue //NOTE: Throw an error here?

                    projectId = parsedEntry.ProjectExtension.Project["@_ProjectId"] || '' //NOTE: Throw an error here?
                    projectName = parsedEntry.ProjectExtension.Project.Name || ''
                }

                else if (name.endsWith('extensions.xsd')) {
                    const parsedEntry = new XMLParser(this.helpers.XmlParserOptions).parse(await entry.text())
                    extension_schema = this.helpers.XmlToJsonNotation(parsedEntry)
                }
            }

            const purged_markups: IMarkup[] = []

            for (let i = 0; i < markups.length; i++) {
                const t = markups[i]
                const markup = new Markup(this, t)
                await markup.read(this.project)
                this.markups.push(markup)

                const purged_markup = { header: markup.header, topic: markup.topic, project: this.project, viewpoints: markup.viewpoints } as IMarkup
                purged_markups.push(purged_markup)
            }

            this.project = new BcfProject(projectVersion, this, projectName, projectId)
            this.project.extension_schema = extension_schema
            this.project.markups = purged_markups.map(mkp => { return { ...mkp, project: this.project } as IMarkup })

        } catch (e) {
            console.log("Error in loading BCF archive. The error below was thrown.")
            console.error(e)
        }
    }

    getEntry = (name: string) => {
        return this.bcf_archive?.entries[name]
    }
    //#endregion

    //#region jszip to export .bcf file
    addEntry = (file: IFileEntry) => {
        this.files.push(file)
    }

    write = async (): Promise<Buffer | undefined> => {
        try {
            createEntries(this, this.project.markups)
            return await exportZip(this.files)
        } catch (e) {
            console.log("Error in writing BCF archive. The error below was thrown.")
            console.error(e)
        }
    }

    removeEntry(lambdaExpression: (actual: IFileEntry) => boolean) {
        const fileredFiles = this.files.filter(file => !lambdaExpression(file))
        this.files = fileredFiles
    }

    //#endregion
}

function createEntries(parser: BcfParser, markups: any) {
    if (!parser.project)
        return

    parser.addEntry(bcfversion(parser.version))
    //parser.addEntry(projectbcfp(parser.project.project_id, parser.project.name))
    //parser.addEntry(extensionssxd(parser))

    for (const markup of markups) {
        const formattedMarkup = parser.helpers.MarkupToXmlNotation(markup)
        parser.markups.push(formattedMarkup)
        let xml = new XMLBuilder(parser.helpers.XmlBuilderOptions).build(formattedMarkup)
        xml = `<?xml version="1.0" encoding="utf-8"?>${xml}`

        if (markup.topic) {
            const guid = markup.topic.guid
            const newEntry = {
                path: `${guid}/markup.bcf`,
                content: xml
            }
            parser.addEntry(newEntry)
        }
    }
}

export function removeEntry(parser: BcfParser, lambdaExpression: (actual: IFileEntry) => boolean) {
    parser.files = parser.files.filter(file => !lambdaExpression(file))
}

async function exportZip(files: IFileEntry[]): Promise<Buffer> {
    var zip = new JSZip()

    //TODO: Not always all the files will be in the unzipit folder. A snapshot may be get from an html, for example.
    for (const file of files) {
        const fullPath = file.path.split('/')

        if (!fullPath)
            continue

        if (fullPath.length == 1)
            zip.file(fullPath[0], file.content)
        else if (fullPath.length == 2)
            zip.folder(fullPath[0])?.file(fullPath[1], file.content)
    }

    return await zip.generateAsync({ type: "nodebuffer", streamFiles: true })
}

function bcfversion(version: string): IFileEntry {
    return {
        path: 'bcf.version',
        content: `<?xml version="1.0" encoding="utf-8"?>
        <Version xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xmlns:xsd="http://www.w3.org/2001/XMLSchema" VersionId="${version}">
      <DetailedVersion>${version}</DetailedVersion>
    </Version>`
    }
}

function projectbcfp(projectId: string, projectName: string): IFileEntry {
    return {
        path: 'project.bcfp',
        content: `<?xml version="1.0" encoding="utf-8"?>
<ProjectExtension xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Project ProjectId="${projectId}">
    <Name>${projectName}</Name>
  </Project>
  <ExtensionSchema>extensions.xsd</ExtensionSchema>
</ProjectExtension>`
    }
}

function extensionssxd(writer: BcfParser): IFileEntry {
    const attributes = [
        'version',
        'encoding',
        'standalone',
        'xmlns',
        'schemaLocation',
        'name',
        'base',
        'value'
    ]

    const options = {
        additional_attributes: attributes,
        firstletter_uppercase: false,
        plural_to_singular: false
    }

    let helpers = writer.helpers

    if (writer.version == '3.0') {
        const v21 = require('./2.1/index')
        const helpersV21: BcfParser = new v21.BcfParser()
        helpers = helpersV21.helpers
    }

    const formattedXml: any = helpers.RenameJsonKeys(writer.project?.extension_schema, options)

    let xml = new XMLBuilder(helpers.XmlBuilderOptions).build(formattedXml)

    return {
        path: 'extensions.xsd',
        content: xml
    }
}

export interface IFileEntry {
    path: string,
    content: any
}

export class Markup {
    readonly reader: BcfParser
    readonly markup_file: ZipEntry

    header: IHeader | undefined
    topic: ITopic | undefined
    viewpoints: VisualizationInfo[] = []

    constructor(reader: BcfParser, markup: ZipEntry) {
        this.reader = reader
        this.markup_file = markup
    }

    read = async (project: IProject) => {
        await this.parseMarkup(project)
        await this.parseViewpoints()
    }

    private parseMarkup = async (project: IProject) => {
        const markup = this.reader.helpers.GetMarkup(await this.markup_file.text(), project)
        this.topic = markup.topic
        this.header = markup.header
    }

    private parseViewpoints = async () => {
        if (!this.topic) return

        if (this.topic.viewpoints) {
            const topic_viewpoints = this.topic.viewpoints

            for (let i = 0; i < topic_viewpoints.length; i++) {
                const entry = topic_viewpoints[i]
                const key = this.topic.guid + "/" + entry.viewpoint
                const file = this.reader.getEntry(key)

                var visualizationInfo: VisualizationInfo = {
                    guid: generateUUID()
                }

                if (file)
                    visualizationInfo = this.reader.helpers.GetViewpoint(await file.text())

                visualizationInfo.snapshot = entry.snapshot
                visualizationInfo.getSnapshot = async () => {
                    if (entry.snapshot)
                        return await this.getSnapshot(entry.snapshot)
                }

                this.viewpoints.push(visualizationInfo)
            }
        }
    }

    /**
     * Parses the png snapshot.
     *
     * @returns {string} The image in base64String format.
     *
     * @deprecated This function is deprecated and will be removed in the next version.<br>
     * Please use viewpoint.getSnapshot() instead.<br>
     *
     */
    getViewpointSnapshot = async (viewpoint: VisualizationInfo | IViewPoint): Promise<string | undefined> => {
        if (!viewpoint || !this.topic) return
        const entry = this.reader.getEntry(`${this.topic.guid}/${viewpoint.snapshot}`)
        if (entry) {
            const arrayBuffer = await entry.arrayBuffer()
            return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer) as any))
        }
    }

    /**
     * Parses the png snapshot.
     *
     * @returns {string} The image in base64String format.
     */
    public getSnapshot = async (guid: string): Promise<string | undefined> => {
        if (!guid || !this.topic) return
        const entry = this.reader.getEntry(`${this.topic.guid}/${guid}`)
        if (entry) {
            const arrayBuffer = await entry.arrayBuffer()
            return btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer) as any))
        }
    }
}