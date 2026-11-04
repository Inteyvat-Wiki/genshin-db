# 上游快照与查询索引

新模式由 GenshinData-scripts 维护完整数据，genshin-db 仅维护查询索引，不复制正文。先显式准备数据，再使用原有查询方法：

以下带 await 的示例在异步函数中执行。

```js
const db = require('genshin-db');
const snapshot = await db.prepare({
    sourceRoot: 'D:/genshin data',
    cacheRoot: 'D:/GenshinCache/data',
    indexCacheRoot: 'D:/GenshinCache/indexes',
    folders: ['characters', 'misc'],
    languages: ['CHS', 'EN'],
});
const huTao = db.characters('Hutao');
const item = db.misc('achievement-80001', { matchIds: true });
```

已有准备结果时无需再次提取：

```js
db.openSnapshot({ cacheRoot: 'D:/GenshinCache/data', snapshotId: '完整快照 ID', indexCacheRoot: 'D:/GenshinCache/indexes' });
// 也可以从上游取得句柄后调用 db.useProvider(snapshot, { cacheRoot: 'D:/GenshinCache/indexes' })。
```

`useProvider()` 不传参数会恢复旧的本地数据适配器。它是迁移兼容入口，不会把旧正文补入不完整的新快照。切换快照会清空当前进程的索引句柄，不复用其他快照的数据。模块导入不会读取巨大的合并 JSON 或执行上游提取。

索引按快照 ID、索引规则内容身份、语言和分类保存。默认目录为用户缓存目录下的 `Inteyvat-Wiki/genshin-db`，可用 `GENSHIN_DB_CACHE` 或上述选项覆盖。索引只含名称、ID、别名、分类及查询所需映射，不保存正文。读到损坏索引时重建；上游正文损坏则明确报错，不吞掉错误并退回旧数据。

重复名称保存在 `nameMatches` 中；旧查询保持首条匹配的兼容行为，不再在索引构建时丢掉其他同名映射。正文从上游按条读取，不留全量正文内存缓存。版本、图片和数值计算的输入从同一快照获取。

当前为 Node.js 数据处理接口；npm 文件白名单已移除合并数据 `src/min/data.min.json`。wiki-data 已接入显式初始化与固定快照实例；旧文件模式保留用于迁移对比。旧浏览器构建尚未改造成新架构；旧 npm 发布及向上游仓库发送通知的流程已停用。包暂设 `private: true`，仍可本地 `npm pack` 和安装，但在确定组织包名与依赖版本前不允许发布到 npm。

包名及版本线尚未调整，`genshindata-scripts` 暂为本地 file 依赖。更换为组织作用域发布包、逐分类精确失效、旧快照清理、真正异步的 I/O 查询以及彻底移除旧数据适配器仍待后续处理；隔离的同步查询实例已提供。

elements、rarity、weaponmaterialtypes、talentmaterialtypes 保留着社区查询接口，但当前本地导出里并没有这些目录。本轮没有按接口名称补造条目。新模式只提供所选提取器及必要关联分类，不隐式回退到旧完整数据。

## 独立查询实例

```js
const data = require('genshindata-scripts');
const first = data.openSnapshot({ cacheRoot: 'D:/GenshinCache/data', snapshotId: '第一份完整快照 ID' });
const second = data.openSnapshot({ cacheRoot: 'D:/GenshinCache/data', snapshotId: '第二份完整快照 ID' });
const a = db.createClient(first, { cacheRoot: 'D:/GenshinCache/indexes' });
const b = db.createClient(second, { cacheRoot: 'D:/GenshinCache/indexes' });
a.setOptions({ resultLanguage: 'ChineseSimplified' });
const item = a.misc('achievement-80001', { matchIds: true });
```

实例的 snapshotId 不可切换，查询默认选项、自定义别名和索引句柄互相隔离；默认 db 的 prepare/useProvider 不影响已创建实例。异步调用者可以交错调用不同实例，不会切换全局数据源。实例没有 addData、useProvider、prepare 或 openSnapshot，完整数据仍由上游准备；别名和查询选项可以在实例内部调整。

原有单例接口继续保留，适合逐步迁移。新调用方优先使用 createClient，而不是频繁切换默认单例。

精确资源读取使用 `client.getRecord('interactions', 'Quest/resource', { language: 'English' })`，给予物品清单使用 `client.interactionGiving(id)`。这两项公开接口也支持旧文件模式；下游不应导入 `src/getdata.js` 或直接读取 `src/data/interactions.json`。

地图初步解析使用独立的 `maps` 分类；已有 `maplayers` 兼容接口保留。将 `maps` 加入上游准备的 folders 后，可以用 `client.maps('point-3-1304', { matchIds: true })` 查询精确记录，或以 `{ matchCategories: true, verboseCategories: true }` 按 `kind` 查询 `point`、`floor` 等分类。跨场景点位与不同资料类别使用不同的字符串 ID，不按裸数值 ID 猜配。查询层只索引名称、ID、类别；原始证据、关联与未知字段仍由同一上游快照保存，wiki-data 必须显式转换后发布。

## 从快照批量建立索引

```text
npm run makeIndex -- --cache D:/GenshinCache/data --index-cache D:/GenshinCache/indexes --folders misc,tcg --languages English
```

可以用 `--snapshot ID` 指定旧快照。命令从上游 catalog() 取得实际目录，不扫描 genshin-db/src/data，不写旧目录中的索引；如果不传 --cache/--snapshot，则暂时沿用旧命令模式。多个分类可用空格或逗号分隔。

程序中可调用 `db.buildIndexes(snapshot, { cacheRoot, folders, languages })`，返回实际完成的语言、分类及数量，不改变默认查询实例或 current。缺损正文会明确报错，不会写空索引覆盖已有结果。
