import { readFileSync, readdirSync } from "fs"

const maximumContentViewPoint = {
    camera_view_point: { x: 12.2088897788292, y: 52.323145074034, z: 5.24072091171001 },
    camera_direction: {
        x: -0.381615611200324,
        y: -0.825232810204882,
        z: -0.416365617893758
    },
    camera_up_vector: { x: 0.05857014928797, y: 0.126656300502579, z: 0.990215996212637 },
    field_of_view: 60
}

// Working since version 0.2.6!
function readAllFilesTest(version, path) {
    describe(`BCF ${version}: Read all files in the folder ${path}`, () => {
        it("Read each test-data file", async () => {
            try {
                const filesNames = readdirSync(path).filter((name) => name.endsWith(".bcf"))

                async function readBcf(fileName) {
                    const fullPath = path.concat(fileName)
                    const file = await readFileSync(fullPath)
                    const { BcfReader } = await import(`../src/${version}`)
                    const reader = new BcfReader()
                    await reader.read(file)

                    expect(reader.markups[0].topic.title).toBeDefined()
                }

                for (const file of filesNames) {
                    await readBcf(file)
                }
            } catch (err) {
                expect(false).toBe(true)
            }
            expect(true).toBe(true)
        })
    })
}
function readFileTest(version, path, topic_title, qte_viewpoints) {
    describe(`BCF ${version}: Read file ${path}`, () => {
        let file
        let reader

        beforeAll(async () => {
            file = readFileSync(path)
            const { BcfReader } = await import(`../src/${version}`)
            reader = new BcfReader()
            await reader.read(file)
        })

        it("BCF is not null", () => {
            expect(reader.markups.length).toBeGreaterThan(0)
        })

        it("Check the title", () => {
            expect(reader.markups[0].topic.title).toBe(topic_title)
        })

        it("Check the number of viewpoints", () => {
            expect(reader.markups[0].viewpoints.length).toBe(qte_viewpoints)
        })
    })
}

function viewpointsTest(version) {
    describe(`BCF ${version}: Read Viewpoints`, () => {
        it("Maximum Content Viewpoint", async () => {
            const file = readFileSync(`./test-data/bcf${version}/MaximumInformation.bcf`)
            const { BcfReader } = await import(`../src/${version}`)
            const reader = new BcfReader()
            await reader.read(file)
            expect(reader.markups[1].viewpoints[0].perspective_camera).toStrictEqual(maximumContentViewPoint)
        })
    })
}

function writerTest() {
    describe(`BCF ${version}: Write a file`, () => {
        let parser

        beforeAll(async () => {
            const { BcfParser } = await import(`../src/${version}`)
            parser = new BcfParser()
        })

        it("BCF is not null", () => {
            expect(parser.markups.length).toBeGreaterThan(0)
        })

        it("Check the title", () => {
            expect(parser.markups[0].topic.title).toBe(topic_title)
        })

        it("Check the number of viewpoints", () => {
            expect(parser.markups[0].viewpoints.length).toBe(qte_viewpoints)
        })
    })
}

function runVersionTests(version) {
    readAllFilesTest(version, `./test-data/bcf${version}/`)
    readFileTest(version, `./test-data/bcf${version}/writer/WriterTest.bcf`, "Topic 1 renamed", 0)
    viewpointsTest(version)
}

runVersionTests("2.1")
runVersionTests("3.0")
