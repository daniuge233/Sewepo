# Sewepo<br/>壁纸，爱来自山师附中

Sewepo是我为山师附中2024级30班开发的壁纸软件，包含时间、天气、课表和随机壁纸功能。

## 使用
### 预设置

1. 在根目录新建images目录，将所有图片按0～n命名并放入。
2. 编辑<code>/js/calendar.js</code>, 在<code>data</code>中按如下json格式存储课表数据：
```json
{
  "classes":{
    "1":["class1", "class2", "..."],
    "2":["..."],
    "..."
  },
  "times_normal":["class1_time", "class2_time", "..."],
  "times_weekends":["..."]
}
```
> 其中，<code>times_normal</code>和<code>times_weekends</code>中的时间表示课表更新的时间，以一天中第sec秒计。一天中的秒数计算可用<code>/tools/time2sec.py</code>计算。

> [!IMPORTANT]
> <code>times_weekends</code>针对像山师附中一样周末和工作日作息不一的情况。如果您的学校不属于这样的情况，需要做额外修改。请移步结尾<code>特殊情况</code>部分。
3. 在与第二步同一个文件中，将「获取天气」部分的连接地址<code>city=</code>后的部分改为您所在的城市名称。比如您在北京，就讲这一行改为：
```js
$.get("https://node.api.xfabe.com/api/weather/get?city=北京", function (res) {
  // ...
}
```
> 这里调用了[小枫公益API](api.xfabe.com)的天气API，在此诚挚感谢。

4. 在和第三步同一个文件中，更改<code>class_normal</code>和<code>class_weekends</code>为每天的课程数。
5. 编辑<code>/index.html</code>，将id为<code>calendar</code>标签下的元素数量按文件中所带的格式改为当日课数。
> [!TIP]
> <code>_we</code>class名忽略即可。

6. 编辑<code>/js/background.js</code>, 将<code>images_cnt</code>改为您的图片总数（从1开始计）。
> 对于存放在<code>/images</code>中的图片，可以使用<code>/tools/rename.py</code>快捷重命名。

> [!CAUTION]
> <code>/tools/rename.py</code>似乎存在问题，使用后需要检查是否存在未被正常修改名称的文件。

### 正式使用

下载并安装任意支持html的壁纸引擎，导入<code>index.html</code>即可。

## 特殊情况
### 不需要<code>times_weekends</code>的情况

请将<code>/js/calendar.js</code>替换为<code>/js/calendar_no_times_weekends.js</code>。
