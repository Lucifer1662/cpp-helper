let resultJson : any = {};

try {
    resultJson = require('./result.json');
    
} catch (e: any) { 
    console.log('error')
}

console.log(resultJson);


let identifiersMap : any = {}
Object.keys(resultJson).forEach(key=>{
    console.log(key)
    resultJson[key].forEach((s:string)=>{
        identifiersMap[s] = key;
    })
})


const fs = require('fs');

const content = JSON.stringify(identifiersMap);

fs.writeFile('get_std_include/cppStdMap.json', content, (err: any) => {
    if (err) {
        console.error(err);
    }
});

