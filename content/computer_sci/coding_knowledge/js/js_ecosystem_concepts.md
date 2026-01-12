---
title: JS Ecosystem Concepts
date: 2026-01-12
tags:
  - javascript
  - basic
  - dev
---
## 1. Node.js

定义：Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行环境，允许你在服务器端运行 JavaScript。

常用命令：

```bash
node script.js              # 运行 JavaScript 文件
node --version             # 查看 Node.js 版本
node -e "console.log(1)"   # 执行代码字符串
node                       # 进入 REPL 交互式环境
```

## 2. npm (Node Package Manager)

定义：npm 是 Node.js 的官方包管理器，用于安装、管理和发布 JavaScript 包。

npm通过package.json和package-lock.json来进行包管理
### package.json

项目的配置文件，记录项目信息和依赖。

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "description": "项目描述",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  },
  
  "engines": { 
	  "node": ">=16.0.0", 
	  "npm": ">=8.0.0" 
  }
}
```


关键字段说明：

* dependencies：生产环境需要的包
* devDependencies：仅开发时需要的包（测试、构建工具等）
* scripts：自定义命令脚本
* version：项目版本，遵循语义化版本（Semantic Versioning）
* engines: 指定项目需要的 Node.js 和 npm 版本。

版本号说明：
```plain text
^4.18.0     主版本不变，允许更新次版本和补丁版本
            可以安装：4.18.0, 4.19.0, 4.20.0 等
            不能安装：5.0.0
~4.18.0     主版本和次版本不变，允许更新补丁版本
            可以安装：4.18.0, 4.18.1, 4.18.2 等
            不能安装：4.19.0
4.18.0      精确版本，只能安装 4.18.0
*           任何版本
>=4.18.0    大于等于 4.18.0 的任何版本
4.18.0 - 5.0.0  版本范围
```


### package-lock.json

定义：依赖版本锁定文件，记录每个依赖的精确版本和来源。

package-lock.json是自动生成的

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "my-project",
      "version": "1.0.0",
      "dependencies": {
        "express": "4.18.2",
        "axios": "1.4.0"
      }
    },
    "node_modules/express": {
      "version": "4.18.2",
      "resolved": "https://registry.npmjs.org/express/-/express-4.18.2.tgz",
      "integrity": "sha512-...",
      "dependencies": {
        "body-parser": "1.20.1",
        "content-disposition": "0.5.4"
      }
    },
    "node_modules/body-parser": {
      "version": "1.20.1",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-1.20.1.tgz",
      "integrity": "sha512-..."
    }
  }
}
```

关键信息：
* version：精确的版本号（不是范围 ）
* resolved：包的下载地址
* integrity：包的完整性校验值（防止被篡改）
* 记录了所有间接依赖（dependencies 的 dependencies）

### npm workflow expression

####  Scene 1: 第一次安装依赖

```bash
npm install
```

1. npm 读取 package.json
2. 根据版本范围（如 ^4.18.0）下载最新兼容版本
3. 假设下载了 express@4.18.2
4. 自动生成 package-lock.json，记录 express 的精确版本是 4.18.2

package.json:

```json
{
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

package-lock.json:

```json
{
  "packages": {
    "node_modules/express": {
      "version": "4.18.2"
    }
  }
}
```

#### Scene 2: 团队成员克隆项目

```bash
git clone project
cd project
npm install
```

发生的事情：
1. npm 读取 package-lock.json
2. 看到 express 的精确版本是 4.18.2
3. 直接下载 4.18.2，不查询最新版本
4. 所有人安装的版本完全相同

#### Scene 3: 更新依赖

```bash
npm update express
```

发生的事情：

1. npm 检查 package.json 中 express 的版本范围（^4.18.0）
2. 查询最新兼容版本，假设是 4.19.0
3. 下载 4.19.0
4. 更新 package-lock.json，改为 4.19.0
5. package.json 保持不变（仍然是 ^4.18.0）

### What time to modify `package.json` and `package-lock.json`

### package.json

应该手动修改：

* 添加新依赖：npm install package-name（自动更新）
* 删除依赖：npm uninstall package-name（自动更新）
* 修改项目信息（name、version、description 等）
* 修改 scripts 脚本
* 修改 engines 要求

不应该手动修改：
* 直接改版本号（应该用 npm install 或 npm update）

### package-lock.json

永远不应该手动修改，因为：

* 它是自动生成的
* 手动修改可能导致不一致
* npm 会自动覆盖你的修改

什么时候会自动更新：

* npm install（首次安装）
* npm update（更新依赖）
* npm install package-name（安装新包）
* npm uninstall package-name（卸载包）

## npx (Node Package Execute)

定义：npx 是 npm 5.2+ 自带的工具，用于执行包中的命令，无需全局安装。

npx的关键在于：

* 不污染全局环境
* 自动下载最新版本
* **执行完自动清理**
* 节省磁盘空间

常用场景：

```bash
# 创建 React 项目
npx create-react-app my-app

# 创建 Vue 项目
npx create-vue@latest

# 运行本地 node_modules 中的命令
npx webpack

# 运行远程 GitHub 仓库中的脚本
npx github-user/repo-name

# 指定版本运行
npx package-name@1.0.0
```

npx vs. npm

| 操作 | npm | npx |
| --- | --- | --- |
| 全局安装 | `npm install -g pkg` | 不需要 |
| 运行命令 | `pkg-command` | `npx pkg-command` |
| 磁盘占用 | 持久占用 | 临时占用 |
| 版本管理 | 手动更新 | 自动最新 |
## nvm (Node Version Manager)

切换和管理不同版本的 Node.js的版本管理工具

常用command：

```bash
nvm --version              # 查看 nvm 版本
nvm list                   # 列出已安装的 Node.js 版本
nvm list-remote            # 列出所有可用的 Node.js 版本
nvm install 18.0.0         # 安装指定版本
nvm install node           # 安装最新版本
nvm install --lts          # 安装最新 LTS 版本
nvm use 18.0.0             # 切换到指定版本
nvm use node               # 切换到最新版本
nvm alias default 18.0.0   # 设置默认版本
nvm uninstall 16.0.0       # 卸载指定版本
```

Example:

```bash
# 项目 A 需要 Node.js 16
nvm use 16
npm install
npm start

# 项目 B 需要 Node.js 18
nvm use 18
npm install
npm start
```

nvm和npm的关系：

```Palin Text
Node.js 版本管理工具（nvm/fnm/Volta ）
    ↓
    ├─ Node.js 18.0.0
    ├─ Node.js 16.0.0
    └─ Node.js 14.0.0
        ↓
        npm（每个 Node.js 版本都自带）
            ↓
            管理项目依赖
```

可以在root文件夹下创建`.nvmrc`文件管理node版本，使用指令`nvm use`

