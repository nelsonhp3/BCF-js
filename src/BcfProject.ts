import { generateUUID } from "./SharedHelpers"
import { IComment, IExtensionsSchema, IMarkup, IProject, ITopic, IViewPoint, VisualizationInfo } from "./schema"
import BcfParser, { IFile } from "./BcfParser"

export default class BcfProject implements IProject {
    version: string
    parser: BcfParser
    /**
     * @deprecated This property is deprecated and will be removed in the next version.<br>
     * Please use project.parser instead.<br>
    */
    public get reader(): BcfParser {
        return this.parser
    }
    markups: IMarkup[] = []
    project_id: string
    name: string
    extension_schema: IExtensionsSchema | undefined

    constructor(version: string, parser: BcfParser, projectName: string, projectId?: string) {
        this.version = version
        this.parser = parser
        this.project_id = projectId ?? generateUUID()
        this.name = projectName
    }

    public async read(file: Buffer) {
        return await this.parser.read(file)
    }

    public async write() {
        return await this.parser.write(this)
    }

    public newMarkup = (topic_type: string, topic_status: string, title: string, creation_author: string, creation_date?: Date): IMarkup => {

        var newTopic: ITopic = {
            guid: generateUUID(),
            topic_type: topic_type,
            topic_status: topic_status,
            title: title,
            comments: [],
            viewpoints: [],
            creation_author: creation_author,
            creation_date: creation_date || new Date(Date.now())// CHECK THIS
        }

        var newMarkup: IMarkup = {
            project: this,
            topic: newTopic,
            viewpoints: [],
        }

        this.markups?.push(newMarkup)
        return newMarkup
    }

    public newComment = (markup: IMarkup, comment: string, author: string, creation_date?: Date, viewpointId?: string): IComment => {
        var newComment: IComment = {
            guid: generateUUID(),
            comment: comment,
            author: author,
            date: creation_date ?? new Date(Date.now()),
            viewpoint: viewpointId
        }

        markup.topic?.comments?.push(newComment)
        return newComment
    }

    public newViewpoint = (markup: IMarkup, snapshotArrayBuffer?: ArrayBuffer, visualizationInfo?: VisualizationInfo, index?: number): IViewPoint => {
        if (!markup.topic)
            throw 'MARKUP WITHOUT TOPIC'

        var newViewpoint: IViewPoint = {
            guid: visualizationInfo ? visualizationInfo.guid : generateUUID(),
            index: index
        }

        //TODO: VisualizationInfo (file.bcfv) is obligatory?
        var newVisualizationInfo: VisualizationInfo = {
            guid: generateUUID()
        }

        if (visualizationInfo)
            newVisualizationInfo = visualizationInfo

        //TODO: Is it necessary a VisualizationInfo even if it's just a snapshot?
        if (visualizationInfo) {
            newViewpoint.viewpoint = `${newViewpoint.guid}.bcfv`

            visualizationInfo.getSnapshot = async (): Promise<string | undefined> => {
                if (snapshotArrayBuffer)
                    return btoa(String.fromCharCode.apply(null, new Uint8Array(snapshotArrayBuffer) as any))
            };
        }

        markup.topic.viewpoints?.push(newViewpoint)
        markup.viewpoints?.push(newVisualizationInfo)

        if (snapshotArrayBuffer)
            this.newSnapshot(markup, snapshotArrayBuffer, newViewpoint.guid)

        return newViewpoint
    }

    public newSnapshot(markup: IMarkup, snapshotArrayBuffer: ArrayBuffer, viewpointId?: string): IViewPoint {

        const guid = viewpointId ?? generateUUID()

        const newSnapshot: IFile = {
            path: `${markup.topic?.guid}/${viewpointId}.png`,
            content: snapshotArrayBuffer,
        };

        var mkpViewpoint = markup.topic?.viewpoints?.find(v => v.guid === guid)
        if (mkpViewpoint)
            this.editViewpointInfo(markup, mkpViewpoint.guid, undefined, `${viewpointId}.png`)
        else
            mkpViewpoint = this.newViewpoint(markup, snapshotArrayBuffer)

        this.parser.addEntry(newSnapshot)
        return mkpViewpoint
    }

    public searchViewpointMarkup(viewpointGUID: string): IMarkup | undefined {
        return this.markups?.filter(mkp => mkp.viewpoints?.find(vp => vp.guid === viewpointGUID))[0]
    }

    public editViewpointInfo(markup: IMarkup, guid: string, viewpoint?: string, snapshot?: string, index?: number, getSnapshot?: () => Promise<string | undefined>) {
        var mkpViewpoint = markup.topic?.viewpoints?.find(v => v.guid === guid)
        var mkpVisualizationInfo = markup.viewpoints?.find(v => v.guid === guid)

        if (!mkpViewpoint)
            return false // 'Viewpoint not found'

        mkpViewpoint.viewpoint = viewpoint ?? mkpViewpoint?.viewpoint;
        mkpViewpoint.snapshot = snapshot ?? mkpViewpoint?.snapshot;
        mkpViewpoint.index = index ?? mkpViewpoint?.index;

        if (mkpVisualizationInfo) {
            mkpVisualizationInfo.snapshot = mkpViewpoint.snapshot
            // If the image is hosted in cloud, for example, change the default getSnapshot() function
            mkpVisualizationInfo.getSnapshot = getSnapshot ?? mkpVisualizationInfo.getSnapshot
        }

        return true
    }
}