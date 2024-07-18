const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const port = 3000;

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const apiURL = 'https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo';
const apiKey = process.env.APIKEY;

const userPortfolio = {};

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', async message => {
        const data = JSON.parse(message);

        switch (data.action) {
            case 'getAllStockInfo':
                const stockInfo = await getAllStockInfo(data.pageNo, data.numOfRows);
                ws.send(JSON.stringify({ action: 'stockInfo', data: stockInfo }));
                break;
            case 'buyStock':
                const buyResult = buyStock(data.userId, data.stockCode, data.amount);
                ws.send(JSON.stringify({ action: 'buyStock', status: 'success', data: buyResult }));
                break;
            case 'sellStock':
                const sellResult = sellStock(data.userId, data.stockCode, data.amount);
                ws.send(JSON.stringify({ action: 'sellStock', status: 'success', data: sellResult }));
                break;
            default:
                ws.send(JSON.stringify({ action: 'error', message: 'Unknown action' }));
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    const interval = setInterval(async () => {
        const stockInfo = await getAllStockInfo(1, 10);
        if (stockInfo) {
            ws.send(JSON.stringify({ action: 'stockUpdate', data: stockInfo }));
        }
    }, 5000);

    ws.on('close', () => {
        clearInterval(interval);
    });
});

async function getAllStockInfo(pageNo = 1, numOfRows = 10) {
    try {
        const url = `${apiURL}?serviceKey=${apiKey}&numOfRows=${numOfRows}&pageNo=${pageNo}`;
        const response = await axios.get(url);
        const parsedData = await xml2js.parseStringPromise(response.data);
        return parsedData.response.body[0].items[0].item;
    } catch (error) {
        console.error('Error fetching stock info:', error);
        return [];
    }
}

function buyStock(userId, stockCode, amount) {
    if (!userPortfolio[userId]) {
        userPortfolio[userId] = {};
    }
    if (!userPortfolio[userId][stockCode]) {
        userPortfolio[userId][stockCode] = 0;
    }
    userPortfolio[userId][stockCode] += amount;
    return { userId, stockCode, amount, status: 'bought', portfolio: userPortfolio[userId] };
}

function sellStock(userId, stockCode, amount) {
    if (!userPortfolio[userId] || !userPortfolio[userId][stockCode] || userPortfolio[userId][stockCode] < amount) {
        return { userId, stockCode, amount, status: 'error', message: 'Not enough stock to sell' };
    }
    userPortfolio[userId][stockCode] -= amount;
    if (userPortfolio[userId][stockCode] === 0) {
        delete userPortfolio[userId][stockCode];
    }
    return { userId, stockCode, amount, status: 'sold', portfolio: userPortfolio[userId] };
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
});
