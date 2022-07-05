import fetch from 'node-fetch'


function extractAround(s: string, lhs: string, rhs: string) {
    const start = s.indexOf(lhs) + lhs.length;
    const end = s.lastIndexOf(rhs);
    return s.substring(start, end)
}

async function getContentForHeader(name: string) {
    try {
        const resp = await fetch(`https://cplusplus.com/reference/${name}/`);
        const text = await resp.text();

        let values = [...text.matchAll(new RegExp('<a href="\\/reference\\/[^"]*"><span>([^&].*)<\\/span>', 'g'))]
        console.log(`Done: ${name}`)
        if(values.length > 0){
            return values.reduce((l,r)=>[...l,...r]).map(s=>extractAround(s, "<span>", "</span>"));
        }
        return [];
    } catch (e) {
        console.log(e);
        console.log(`Error: ${name}`);
    }
}


const run = async () => {
    const resp = await fetch("https://cplusplus.com/reference/");
    const body = await resp.text();
    const hrefs = body.match(new RegExp('href="\\/reference\\/[^"]*">', 'g')) || [];
    let links = hrefs.map(href => extractAround(href, '"href="/reference/', '/">')).filter(s=> s!=='/');
   
    let types: (string[] | undefined)[] = [];
    for (let index = 0; index < links.length; index++) {
        types.push(await getContentForHeader(links[index]))
    }


    let result: any = {};

    links.forEach((link, i) => {
        result[link] = types[i]
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

