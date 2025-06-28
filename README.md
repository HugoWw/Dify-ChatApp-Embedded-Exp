# Dify-ChatApp-Embedded-Exp

### This project is designed to achieve a smooth window zooming function when embedded in the chatweb of the dify application. The style of dify can also be modified by injecting custom styles. Please indicate the source when using the code.

> ⚠️ Note: The current project has resolved the front-end cross-domain issue through a proxy. In the actual production environment, you need to solve the front-end cross-domain problem between your own application and the Dify application by yourself.

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Demo
https://github.com/user-attachments/assets/e580893d-70f9-4774-bd4e-561a7234426a


## Config: 
In `src/setupProxy.js` file, Replace the address(http://xxxxxx) of your Dify. 
```js
    app.use(
        proxyPaths, 
        createProxyMiddleware({
        target: 'http://xxxxxx', // Dify 服务地址
        changeOrigin: true,
        ....
```

In `src/component/DifyChatBubble.jsx` file, Replace the "xxx" with your Dify chatbot id.
```js
const DIFY_CHATBOT_URL = "http://localhost:3000/api/chatbot/xxx";
```




## Getting Started
First, install dependencies:
```bash
npm install
```
Then, run the development server:
```bash
npm start
```

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
