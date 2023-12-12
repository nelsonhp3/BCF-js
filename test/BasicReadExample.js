const bcfjs21 = require("../dist/2.1")
const bcfjs30 = require("../dist/")
const { readFileSync } = require("fs")

const loadFile = (version) => {
    return readFileSync(`./test-data/bcf${version}/MaximumInformation.bcf`)
}

const testV21 = async () => {
    const file = await loadFile("2.1")

    const parser = new bcfjs21.BcfParser()
    await parser.read(file)

    const project = parser.project
    console.log("project :>> ",project)

    project.markups.forEach((markup) => {
        if (markup == undefined) return

        console.log("title",markup.topic.title)

        if (markup.viewpoints.length > 0) {
            const v = markup.viewpoints


            if (v[0].perspective_camera)
                console.log(v[0].perspective_camera)

            // Uncomment to see in Console the image data
            // v[0].getSnapshot().then(img => {
            //     if (img)
            //         console.log('base64String image data: ', img)
            // })
        }
    })
}

const testV30 = async () => {
    const file = await loadFile("3.0")

    const parser = new bcfjs30.BcfParser()
    await parser.read(file)

    const project = parser.project
    console.log("project :>> ",project)

    project.markups.forEach((markup) => {
        if (markup == undefined) return

        console.log("title",markup.topic.title)

        if (markup.viewpoints.length > 0) {
            const v = markup.viewpoints

            if (v[0].perspective_camera)
                console.log(v[0].perspective_camera)

            // Uncomment to see in Console the image data
            // v[0].getSnapshot().then((img) => {
            //   if (img) console.log("base64String image data: ", img);
            // });
        }
    })
}

testV21()
testV30()
