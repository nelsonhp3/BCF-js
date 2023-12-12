const bcfjs21 = require("../dist/2.1")
const bcfjs30 = require("../dist/")
const { readFileSync } = require("fs")
const { readFile } = require("fs/promises")

const testV21 = async () => {
    const file = await readFile("./test-data/bcf2.1/MaximumInformation.bcf")
    const reader = new bcfjs21.BcfReader()
    await reader.read(file)

    const project = reader.project
    console.log("project :>> ",project)

    project.markups.forEach((markup) => {
        if (markup == undefined) return

        console.log("title",markup.topic.title)

        if (markup.viewpoints.length > 0) {
            console.log(markup.viewpoints[0].perspective_camera)

            const v = markup.viewpoints

            if (!v) return

            // Uncomment to see in Console the image data
            // v[0].getSnapshot().then(img => {
            //     if (img)
            //         console.log('base64String image data: ', img)
            // })
        }
    })
}

const loadFile = (version) => {
    return readFileSync(`./test-data/bcf${version}/MaximumInformation.bcf`)
}

const testV30 = async () => {
    const file = await loadFile("3.0")

    const reader = new bcfjs30.BcfReader()
    await reader.read(file)

    const project = reader.project

    project.markups.forEach((markup) => {
        if (markup == undefined) return

        console.log("title",markup.topic.title)

        if (markup.viewpoints.length > 0) {
            console.log(markup.viewpoints[0].perspective_camera)

            const v = markup.viewpoints

            if (!v) return

            // Uncomment to see in Console the image data
            // v[0].getSnapshot().then((img) => {
            //   if (img) console.log("base64String image data: ", img);
            // });
        }
    })
}

//testV21()
//testV30()

const test = async () => {
    const file = await readFile(`./test-data/bcf3.0/writer/WriterTest.bcf`)
    console.log("file :>> ",file)

    const reader = new bcfjs30.BcfReader()
    await reader.read(file)

    const project = reader.project
    console.log('project :>> ',project)

    project.markups.forEach((markup) => {
        if (markup == undefined) return

        console.log("title",markup.topic.title)

        if (markup.viewpoints.length > 0) {
            console.log(markup.viewpoints[0].perspective_camera)

            const v = markup.viewpoints

            if (!v) return

            // Uncomment to see in Console the image data
            // v[0].getSnapshot().then((img) => {
            //   if (img) console.log("base64String image data: ", img);
            // });
        }
    })
}
test()
