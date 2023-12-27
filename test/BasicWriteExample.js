const bcfjs21 = require("../dist/2.1")
const bcfjs30 = require("../dist")
const fs = require("fs")

const writeFile = async (content,filePath) => {
    const lastSlashIndex = filePath.lastIndexOf('/')
    const folderPath = filePath.substring(0,lastSlashIndex)
    if (!fs.existsSync(folderPath))
        fs.mkdirSync(folderPath)
    fs.writeFile(filePath,content,(err) => { if (err) console.log("Error on write file: ",err) })
}

const testV21 = async () => {
    const file = fs.readFileSync("./test-data/bcf2.1/MaximumInformation.bcf")
    const parser = new bcfjs21.BcfReader()
    await parser.read(file)

    let bcfproject = parser.project
    bcfproject.name = "This was modified by bcf-js"
    bcfproject.markups[0].topic.title = "Topic 1 renamed"
    bcfproject.markups[1].topic.title = "Topic 2 renamed"

    // Add Snapshots, Markup.xsd, Viewpoints... to the file
    for (const entry in parser.bcf_archive.entries) {

        if (entry.endsWith("markup.bcf"))
            continue

        parser.addEntry({
            path: entry,
            content: await parser.getEntry(entry).arrayBuffer()
        })
    }

    const buffer = await parser.write(bcfproject)
    await writeFile(buffer,"./test-data/bcf2.1/writer/WriterTest.bcf")
}

const testV30 = async () => {
    const file = fs.readFileSync("./test-data/bcf3.0/MaximumInformation.bcf")
    const parser = new bcfjs30.BcfReader()
    await parser.read(file)

    let bcfproject = parser.project
    bcfproject.name = "This was modified by bcf-js"
    bcfproject.markups[0].topic.title = "Topic 1 renamed"
    bcfproject.markups[1].topic.title = "Topic 2 renamed"

    // Add Snapshots, Markup.xsd, Viewpoints... to the file
    for (const entry in parser.bcf_archive.entries) {

        if (entry.endsWith("markup.bcf") || entry.endsWith('.version'))
            continue

        parser.addEntry({
            path: entry,
            content: await parser.getEntry(entry).arrayBuffer()
        })
    }

    parser.removeEntry((file) => { file.path.endsWith('.xsd') || file.path.endsWith('.bcfp') })
    const buffer = await parser.write(bcfproject)
    await writeFile(buffer,"./test-data/bcf3.0/writer/WriterTest.bcf")
}

const testCreateProject = async () => {
    var project = new bcfjs30.BcfProject('Willow Grove Residences')

    project = testProjectFunctions(project)

    const buffer = await project.write()
    await writeFile(buffer,"./test-data/bcf3.0/writer/WriterTestNewProject.bcf")
}

const testProjectFunctions = (project) => {
    const maximumContentViewPoint = {
        camera_view_point: { x: 12.2088897788292,y: 52.323145074034,z: 5.24072091171001 },
        camera_direction: {
            x: -0.381615611200324,
            y: -0.825232810204882,
            z: -0.416365617893758
        },
        camera_up_vector: { x: 0.05857014928797,y: 0.126656300502579,z: 0.990215996212637 },
        field_of_view: 60
    }

    var snapshotFile = fs.readFileSync('./test-data/snapshot_writer_test.png')
    var snapshotArrayBuffer = snapshotFile.buffer

    // Create Markup 01
    var created_markup = project.newMarkup('clash','open','01 - Pipe clashing a structural column','Nelson Henrique')

    // Put viewpoint with snapshot in Markup 01
    var created_viewpoint = project.newViewpoint(created_markup,snapshotArrayBuffer)
    //return project
    // Create a comment with that viewpoint
    var created_comment = project.newComment(created_markup,'Easy. Just move the column 👌','Nelson Henrique',null,created_viewpoint.guid)

    // Create Markup 02
    var created_markup2 = project.newMarkup('clash','open','02 - Beam below ceiling','Nelson Henrique')

    // Create a viewpoint with visualizationInfo, but no snapshot
    var created_viewpoint2 = project.newViewpoint(created_markup2,undefined,{ perspective_camera: maximumContentViewPoint })

    // Put a snapshot in the last viewpoint
    var created_snapshot = project.newSnapshot(created_markup2,snapshotArrayBuffer,created_viewpoint2.viewpoint.guid)

    var search_viewpoint2 = project.searchViewpoint(created_snapshot.viewpoint.guid)

    var delete_snapshot_vp2 = project.removeSnapshot(search_viewpoint2.viewpoint.guid)

    // Create Markup 03
    var created_markup3 = project.newMarkup('test','open',"03 - Markup's Viewpoint",'Nelson Henrique')

    // DELETE
    project.removeSnapshot(search_viewpoint2.viewpoint.guid)
    project.removeViewpoint(created_viewpoint.guid)
    project.removeComment(created_comment.guid)
    project.removeMarkup(created_markup2.topic.guid)

    return project
}

testV21()
testV30()
testProjectFunctions()