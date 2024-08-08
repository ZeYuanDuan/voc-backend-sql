# 選擇基於 Node.js 20.11.1 的官方鏡像
FROM node:20.11.1

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json 到工作目錄
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製應用程式原始碼到工作目錄
COPY . .

# 開放應用程式執行的端口（例如：3000）
EXPOSE 3000

# 定義容器啟動時運行的命令
CMD ["npm", "start"]
