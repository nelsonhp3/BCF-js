import { IFileEntry } from "../BcfParser"
import { IMarkup, ITopic, IComment, VisualizationInfo, IViewPoint, IProject } from "../schema"
import { generateUUID } from "../SharedHelpers"

export function newMarkup(project: IProject, topic_type: string, topic_status: string, title: string, creation_author: string, creation_date?: Date): IMarkup {

    var newTopic: ITopic = {
        guid: generateUUID(),
        topic_type: topic_type,
        topic_status: topic_status,
        title: title,
        comments: [],
        viewpoints: [],
        creation_author: creation_author,
        creation_date: creation_date || new Date(Date.now()) // CHECK this
    }

    var newMarkup: IMarkup = {
        project: project,
        topic: newTopic,
        viewpoints: [],
    }

    project.markups?.push(newMarkup)
    return newMarkup
}

export function newComment(markup: IMarkup, comment: string, author: string, creation_date?: Date, viewpointId?: string): IComment {
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

export function newViewpoint(markup: IMarkup, snapshotArrayBuffer?: ArrayBuffer, visualizationInfo?: VisualizationInfo, index?: number): any {
    if (!markup.topic)
        throw 'MARKUP WITHOUT TOPIC'

    var newViewpoint: IViewPoint = {
        guid: generateUUID(),
        index: index
    }

    //TODO: VisualizationInfo (file.bcfv) is obligatory?
    var newVisualizationInfo: VisualizationInfo = {
        guid: newViewpoint.guid
    }

    if (visualizationInfo)
        newVisualizationInfo = { ...visualizationInfo, guid: newViewpoint.guid }

    //TODO: Is it necessary a VisualizationInfo even if it's just a snapshot?
    // if (visualizationInfo) {
    //     newViewpoint.viewpoint = `${newViewpoint.guid}.bcfv`

    //     visualizationInfo.getSnapshot = async (): Promise<string | undefined> => {
    //         if (snapshotArrayBuffer)
    //             return btoa(String.fromCharCode.apply(null, new Uint8Array(snapshotArrayBuffer) as any))
    //     };
    // }

    markup.topic.viewpoints?.push(newViewpoint)
    markup.viewpoints?.push(newVisualizationInfo)

    if (snapshotArrayBuffer)
        newSnapshot(markup, snapshotArrayBuffer, newViewpoint.guid)

    return { viewpoint: newViewpoint, visualizationInfo: newVisualizationInfo }
}

export function newSnapshot(markup: IMarkup, snapshotArrayBuffer: ArrayBuffer, viewpointId?: string): IViewPoint {

    const project = markup.project
    const guid = viewpointId ?? generateUUID()

    var mkpViewpoint: any = {}

    if (viewpointId) {
        const searchResult = searchViewpoint(project, viewpointId)
        if (!searchResult) throw new Error('searchViewpoint returned with no result')
        mkpViewpoint = editViewpointInfo(markup.project, guid, `${viewpointId}.png`)
        searchResult.visualizationInfo.getSnapshot = async (): Promise<string | undefined> => {
            if (snapshotArrayBuffer)
                return btoa(String.fromCharCode.apply(null, new Uint8Array(snapshotArrayBuffer) as any))
        }
    }
    else
        mkpViewpoint = newViewpoint(markup, snapshotArrayBuffer)

    const newSnapshotFile: IFileEntry = {
        path: `${markup.topic?.guid}/${guid}.png`,
        content: snapshotArrayBuffer,
    }

    project.parser.addEntry(newSnapshotFile)
    return mkpViewpoint
}

export function searchViewpointMarkup(project: IProject, viewpointGUID: string): IMarkup | undefined {
    return project.markups?.filter(mkp => mkp.viewpoints?.find(vp => vp.guid === viewpointGUID))[0]
}

export function editViewpointInfo(project: IProject, guid: string, snapshot?: string, index?: number, getSnapshot?: () => Promise<string | undefined>) {
    const searchResult = searchViewpoint(project, guid)
    if (!searchResult) return false
    const { viewpoint, visualizationInfo, markup } = searchResult

    if (!viewpoint)
        return false // 'Viewpoint not found'

    viewpoint.snapshot = snapshot ?? viewpoint?.snapshot
    viewpoint.index = index ?? viewpoint?.index

    if (visualizationInfo) {
        visualizationInfo.snapshot = viewpoint.snapshot
        // If the image is hosted in cloud, for example, change the default getSnapshot() function
        visualizationInfo.getSnapshot = getSnapshot ?? visualizationInfo.getSnapshot
    }

    return { viewpoint: viewpoint, visualizationInfo: visualizationInfo }
}

export function removeMarkup(project: IProject, markupId: string) {
    project.markups = project.markups.filter(markup => markup.topic.guid != markupId)
}

export function removeComment(project: IProject, commentId: string) {
    for (var i = 0; i < project.markups.length; i++)
        project.markups[i].topic.comments = project.markups[i].topic?.comments?.filter(comment => comment.guid != commentId)
}

export function removeSnapshot(project: IProject, viewpointId: string): void {
    const vpQuery = searchViewpoint(project, viewpointId)
    vpQuery.viewpoint.snapshot = undefined
    vpQuery.visualizationInfo.snapshot = undefined
    vpQuery.visualizationInfo.getSnapshot = undefined
}

export function removeViewpoint(project: IProject, viewpointId: string): void {
    const searchResult = searchViewpoint(project, viewpointId)
    if (!searchResult) return
    const { viewpoint, visualizationInfo, markup } = searchResult


    if (!viewpoint) return
    // const markup: IMarkup = viewpoint.markup
    markup.viewpoints?.filter((vi: { guid: string }) => vi.guid != viewpointId)
    markup.topic.viewpoints?.filter((vp: { guid: string }) => vp.guid != viewpointId)
    const comment = searchComments(project, (comment) => comment.guid == viewpointId)
    if (comment)
        comment[0].comment.viewpoint = undefined
}

export function searchViewpoint(project: IProject, viewpointId: string): any {
    for (var i = 0; i < project.markups.length; i++) {
        const visualizationInfo = project.markups[i].viewpoints?.find(visualizationInfo => visualizationInfo.guid == viewpointId)
        if (!visualizationInfo) continue
        const viewpoint = project.markups[i].topic.viewpoints?.find(viewpoint => viewpoint.guid == viewpointId)
        if (!viewpoint) continue
        return { viewpoint: viewpoint, visualizationInfo: visualizationInfo, markup: project.markups[i] }
    }
    return undefined
}

export function searchComments(project: IProject, predicate: (comment: IComment) => boolean): any {
    var comments = []
    for (var i = 0; i < project.markups.length; i++) {
        const comment = project.markups[i].topic?.comments?.find(comment => predicate(comment))
        if (comment)
            comments.push({ comment: comment, markup: project.markups[i] })
    }
    return comments
} 