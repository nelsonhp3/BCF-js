import { generateUUID } from "./SharedHelpers"
import { IComment, IExtensionsSchema, IMarkup, IProject } from "./schema"
import BcfParser from "./BcfParser"
import * as projectHelpers from "./helpers/ProjectHelpers"

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

    constructor(version: string, parser: BcfParser, projectName?: string, projectId?: string) {
        this.version = version
        this.parser = parser
        this.parser.project = this
        this.project_id = projectId ?? generateUUID()
        this.name = projectName ?? ''
    }

    public async read(file: Buffer) {
        return await this.parser.read(file)
    }
    public async write() {
        return await this.parser.write()
    }

    public newMarkup(topic_type: string, topic_status: string, title: string, creation_author: string, creation_date?: Date): IMarkup {
        return projectHelpers.newMarkup(this, topic_type, topic_status, title, creation_author, creation_date)
    }
    public newComment(markupId: string, comment: string, author: string, creation_date ?: Date, viewpointId ?: string): IComment {
        return projectHelpers.newComment(this, markupId, comment, author, creation_date, viewpointId)
    }
    public newViewpoint = projectHelpers.newViewpoint
    public newSnapshot = projectHelpers.newSnapshot
    public editViewpointInfo(guid: string, snapshot?: string, index?: number, getSnapshot?: () => Promise<string | undefined>) {
        return projectHelpers.editViewpointInfo(this, guid, snapshot, index, getSnapshot)
    }
    public removeMarkup(markupId: string) {
        return projectHelpers.removeMarkup(this, markupId)
    }
    public removeComment(commentId: string) {
        return projectHelpers.removeComment(this, commentId)
    }
    public removeViewpoint(viewpointId: string) {
        return projectHelpers.removeViewpoint(this, viewpointId)
    }
    public removeSnapshot(viewpointId: string): void {
        return projectHelpers.removeSnapshot(this, viewpointId)
    }
    public searchComments(predicate: (comment: IComment) => boolean): any {
        return projectHelpers.searchComments(this, predicate)
    }
    public searchViewpoint(viewpointId: string): any {
        return projectHelpers.searchViewpoint(this, viewpointId)
    }
}