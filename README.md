# DS NewsTop

![DS NewsTop 封面：多平台卡片与白天、黑夜配色](https://raw.githubusercontent.com/awsezxcv/DS-NewsTop/main/assets/cover.png)

<sub>封面为界面示意图。</sub>

**把全网热点带进 DSH Desktop 侧边栏。**

DS NewsTop 是一款为 DSH Desktop 打造的每日热榜插件，以多平台彩色卡片集中展示热门话题、科技资讯与社区分享。支持自由添加或移除展示平台、卡片独立滚动、单卡刷新和全部刷新，并提供白天、黑夜及跟随 DSH 的自动配色。平台选择与颜色设置会自动保存，让你在使用 AI 助手的同时，一眼掌握关注的热点。

## 功能

- **19 个可选来源**：按需勾选平台，调整后即时生效，默认展示其中 14 个。
- **卡片式布局**：适应窗口宽度，各平台独立滚动，展示排名、更新时间和来源提供的热度信息。
- **小众软件最新发现**：读取发现频道的 Markdown 页面，过滤“内容提交规则”，保留页面顺序中的前 10 条分享。
- **灵活刷新**：支持单卡刷新、刷新全部，以及加载失败后重试；刷新失败时保留上一次内容。
- **三种配色**：白天、黑夜、自动；自动模式跟随 DSH 当前主题，使用宿主的背景、文字和边框配色。
- **本地记忆**：平台与配色偏好保存在当前 DSH 的本地浏览器存储中，重新打开后保留。
- **原文跳转**：点击标题，在外部浏览器打开对应来源页面。

## 支持来源

| 来源 | 内容 |
| --- | --- |
| 小众软件 | 最新发现，过滤规则帖后的前 10 条分享 |
| 知乎 | 热榜 |
| V2EX | 最新分享 |
| 酷安 | 今日最热 |
| 少数派 | 热门文章 |
| 稀土掘金 | 热榜 |
| 虎扑 | 主干道热帖 |
| 哔哩哔哩 | 热搜 |
| 微博 | 热搜 |
| 百度 | 热搜 |
| 抖音 | 热点 |
| 贴吧 | 热议 |
| 今日头条 | 热榜 |
| 澎湃新闻 | 热榜 |
| IT之家 | 最新资讯 |
| Solidot | 科技资讯 |
| GitHub | 今日趋势 |
| Hacker News | 热门 |
| 远景论坛 | 最新帖子 |

## 安装

已在 **DSH Desktop 2.0.18** 上验证。插件声明兼容的 DSH 核心版本为 `0.2.1-rc.2` / `0.2.1-rc.3`；其他版本尚未验证。

1. 在 DSH Desktop 菜单中选择“打开 DSH 终端”，进入当前使用的 Profile。
2. 从 npm 安装插件，默认桌面 Profile 路径如下：

   ```sh
   cd ~/.dsh/profiles/desktop
   pnpm add dsh-hot-list@1.3.2
   ```

   也可从 [Releases](https://github.com/awsezxcv/DS-NewsTop/releases) 下载 `.tgz`，将安装命令中的包名替换为文件的完整路径。
3. 编辑该目录中的 `package.json`，在 `dsh.profile.bundles` 数组中加入 `"dsh-hot-list"`，保留原有项目。例如：

   ```json
   {
     "dsh": {
       "profile": {
         "bundles": [
           "@deepseek-ai/dsh-base",
           "@deepseek-ai/dsh-web-app",
           "dsh-hot-list"
         ]
       }
     }
   }
   ```

   上面仅展示相关字段，请勿用它覆盖完整配置；如果已经存在 `dsh-hot-list`，无需重复添加。
4. 完全退出并重新打开 DSH Desktop，点击侧边栏“每日热榜”。

项目展示名称为 **DS NewsTop**，内部包名和侧边栏入口仍为 `dsh-hot-list` / “每日热榜”，以兼容已有安装。

### 从源码打包

本仓库包含可直接加载的 JavaScript，无需额外构建或安装依赖：

```sh
git clone https://github.com/awsezxcv/DS-NewsTop.git
cd DS-NewsTop
npm test
npm pack
```

然后按上面的步骤安装生成的 `.tgz` 文件。

## 使用与更新机制

- 点击右上角“配置”，勾选添加平台，取消勾选移除平台。
- 颜色模式可选择“白天”“黑夜”或“自动 · 跟随 DSH”。
- 打开面板时加载已启用来源；新添加平台时加载该来源。
- **当前没有定时自动刷新**，可点击卡片刷新按钮或“刷新全部”获取更新。
- 宿主对普通请求缓存 60 秒；手动刷新会跳过插件自身缓存，但上游仍可能返回缓存内容，因此不保证每次刷新都会改变榜单。
- NewsNow 来源显示上游的更新时间；小众软件卡片显示本次获取列表的时间。

## 实现与数据来源

```text
lib/index.js       宿主接口、60 秒内存缓存、小众软件列表解析
lib/client.js      侧边栏入口、卡片界面、平台配置与颜色模式
cordis.patch.yml   DSH bundle 注册
```

浏览器通过宿主提供的同源接口 `/dsh-hot-list/items?id=<sourceID>` 读取数据。宿主只请求代码中固定的 NewsNow 服务或小众软件发现页面，不接受自定义上游网址。

- 聚合榜单：[NewsNow](https://newsnow.busiyi.world/)
- 小众软件发现：[发现频道](https://meta.appinn.net/c/faxian/10.md)

本插件需要联网访问上述服务；某个上游不可用时，对应卡片会显示重试入口。

## 致谢

**特别感谢 [NewsNow](https://github.com/newsnext/newsnow) 项目、作者 [ourongxing](https://github.com/ourongxing) 及所有贡献者。** NewsNow 提供了优秀的热点聚合服务，本插件的大部分榜单数据来自其公开接口，卡片式阅读体验也受其启发。欢迎前往原项目了解、支持并为其点亮 Star。

同时感谢[小众软件社区](https://meta.appinn.net/)开放发现频道的 Markdown 内容，以及 DSH Desktop 提供的插件能力。

本项目是独立的 DSH Desktop 插件，与上述项目没有官方隶属关系。榜单标题、热度等内容来自对应平台，相关内容权利归原作者及平台所有。

## 开源许可

[MIT License](LICENSE)。
