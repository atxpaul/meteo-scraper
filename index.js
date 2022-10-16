import axios from 'axios';
import { load } from 'cheerio';
import qs from 'qs';
import config from './config/config.js';
import moment from 'moment';
import fs from 'fs';

async function scrap(date, year, month, day) {
    console.log(`Fetching date ${date}`);
    const url = config.url;
    const headers = config.headers;

    let data = qs.stringify({
        Provincia: 'A+CORUÑA',
        id_hija: '1387',
        Indicativo: '1387',
        Nombre: 'A+CORUÑA',
        Iday: day,
        Imonth: month,
        Iyear: year,
        Iddmmyyyy: date,
        Validacion: '1',
    });

    var configAxios = {
        method: 'post',
        url: url,
        headers: {
            headers,
        },
        data: data,
    };

    const response = await axios(configAxios);

    const $ = load(response.data);
    let scraped;
    let last = '';
    $('#Resultados > tbody > tr > td').each((index, element) => {
        scraped += `"${$(element).text().replace(/\s|:/g, '')}"`;
        if ($(element).text().includes(':') && last == 'value') {
            scraped += `:`;
            last = 'key';
        } else {
            scraped += `,`;
            last = 'value';
        }
    });

    scraped = `{"${scraped.substring(22).slice(0, -1).replaceAll(',""', '')}}`;
    const weather = JSON.parse(scraped);
    weather.Fecha = date;
    return weather;
}

function getDatesInRange(startDate, endDate) {
    const date = new Date(startDate.getTime());

    const dates = [];

    while (date <= endDate) {
        dates.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    console.log(dates);
    return dates;
}

async function saveToJsonTempFile(object) {
    let content = await getJsonTempContent();
    content.push(object);
    const json = JSON.stringify(content, null, 4);
    try {
        await fs.promises.writeFile('temp.json', json, 'utf-8');
    } catch (err) {
        console.log(err);
    }
    return object;
}

async function getJsonTempContent() {
    let content;
    try {
        content = await fs.promises.readFile('temp.json', 'utf-8');
    } catch (err) {}
    if (content) {
        return JSON.parse(content);
    } else {
        return [];
    }
}

const dateNow = moment();
const currentDate = dateNow.format('YYYY/MM/DD');

const d1 = new Date('1930-09-01');
const d2 = new Date(currentDate);

const dateRange = getDatesInRange(d1, d2);

for (let index in dateRange) {
    let datetime = new Date(dateRange[index]);
    let year = datetime.getFullYear();
    let month = datetime.getMonth() + 1;
    let day = datetime.getDate();
    let fullDate = `${('00' + day).slice(-2)}-${('00' + month).slice(
        -2
    )}-${year}`;
    //console.log(year, month, day, fullDate);
    let weather = await scrap(fullDate, year, month, day);
    await saveToJsonTempFile(weather);
}

const weatherAsJson = await getJsonTempContent();

const items = weatherAsJson;
const replacer = (key, value) => (value === null ? '' : value); // specify how you want to handle null values here
const header = Object.keys(items[0]);
const csv = [
    header.join(';'), // header row first
    ...items.map((row) =>
        header
            .map((fieldName) => JSON.stringify(row[fieldName], replacer))
            .join(';')
    ),
].join('\r\n');

console.log(csv);

try {
    console.log('Saving file to data.csv');
    await fs.promises.writeFile('data.csv', csv, 'utf-8');
} catch (err) {
    console.log(err);
}
