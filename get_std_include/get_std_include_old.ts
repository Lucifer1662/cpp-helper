import fetch from 'node-fetch'


function extractAround(s: string, lhs: string, rhs: string) {
    const start = s.indexOf(lhs) + lhs.length;
    const end = s.lastIndexOf(rhs);
    return s.substring(start, end)
}

async function getContentForHeader(name: string) {
    try {
        const resp = await fetch(`https://en.cppreference.com/mwiki/index.php?title=${name}&action=edit`);
        const text = await resp.text();
        const start = text.indexOf("<textarea")
        const end = text.indexOf("</textarea>")
        const desc = text.substring(start, end);
        const matches = desc.match(new RegExp('{{dsc inc \\| [\\w\\d\\/]* .*}}', 'g')) || []
        const types = matches.map(m => m.substring(m.lastIndexOf(' ') + 1, m.length - 2));
        console.log(`Finished: ${name}`)

        return types;
    } catch (e) {
        console.log(`Error: ${name}`)
    }
}


const run = async () => {
    const resp = await fetch("https://en.cppreference.com/w/cpp/header");
    const body = await resp.text();
    const hrefs = body.match(new RegExp('href="[^"]*"', 'g')) || [];
    let links = hrefs.map(href => extractAround(href, '"/w/', '"')).filter(s => s.includes("header")).filter(s => s.startsWith("cpp/header"));

    let resultJson : any = {};
    try {
        resultJson = require('./result.json');
        Object.keys(resultJson).forEach(key => {
            if (resultJson[key] === undefined) {
                delete resultJson[key];
            }
        })
    } catch (e: any) { }

    const finished = Object.keys(resultJson).map(key => 'cpp/header/' + key);
    links = links.filter(link => finished);
    console.log(links);
    // links = [links[3],links[5],links[6]];
    let types: (string[] | undefined)[] = [];
    for (let index = 0; index < links.length; index++) {
        types.push(await getContentForHeader(links[index]))
    }


    let result: any = {};

    links.forEach((link, i) => {
        result[link.replace("cpp/header/", "")] = types[i]
    });

    console.log(result);
    const fs = require('fs');

    const content = JSON.stringify(result);

    fs.writeFile('get_std_include/result.json', content, (err: any) => {
        if (err) {
            console.error(err);
        }
    });


};

run();

