const bcfjs21 = require("../dist/2.1")
const bcfjs30 = require("../dist")
const fs = require("fs")

const writeFile = async (content, filePath) => {
    const lastSlashIndex = filePath.lastIndexOf('/')
    const folderPath = filePath.substring(0, lastSlashIndex)
    if (!fs.existsSync(folderPath))
        fs.mkdirSync(folderPath)
    fs.writeFile(filePath, content, (err) => { if (err) console.log("Error on write file: ", err) })
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

    const buffer = await parser.write(bcfproject)
    await writeFile(buffer,"./test-data/bcf3.0/writer/WriterTest.bcf")
}

const testCreateProject = async () => {
    var snapshotFile = fs.readFileSync('./test-data/snapshot_writer_test.png')
    var snapshotArrayBuffer = snapshotFile.buffer

    var project = new bcfjs30.BcfProject('Willow Grove Residences')
    var created_markup = project.newMarkup('clash','open','Pipe clashing a structural column','Nelson Henrique')
    var created_viewpoint = project.newViewpoint(created_markup,snapshotArrayBuffer)
    //var created_snapshot = project.newSnapshot(created_markup,created_viewpoint.guid,snapshotArrayBuffer)
    var created_comment = project.newComment(created_markup,'Easy. Just move the column 👌','Nelson Henrique',null,created_viewpoint.guid)

    const buffer = await project.write()
    await writeFile(buffer,"./test-data/bcf3.0/writer/WriterTestNewProject.bcf")
}

testV21()
testV30()
testCreateProject()