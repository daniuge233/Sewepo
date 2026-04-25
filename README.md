Sewepo  
当一个电教委员懒得自己关电脑...  
![image](https://img.shields.io/github/repo-size/daniuge233/Sewepo) ![image](https://img.shields.io/github/license/daniuge233/Sewepo)
==========  

Sewepo是我为山东师大附中2024级26班的多媒体制作的壁纸程序，包含一些基本的班级服务功能，如课表、天气、日历、自动关机等。  

![image](/imgs/preview.png)

此项目是[原Sewepo项目](https://github.com/daniuge233/SewepoLegacy)的完全重写，使项目更加结构化。  

开始使用
----------

这里针对的是对程序等不了解的同学，因此比较详细。  
_别慌，一步步慢慢来~_  

> [!IMPORTANT]
> 由于Windows系统在班级多媒体中的普及性，本项目暂时只支持Windows系统。  
> 本项目为壁纸形式，故依赖壁纸引擎。  
> 此部分展示的所有JSON代码均仅做说明，并非标准JSON代码。请勿直接复制粘贴！

1. 在项目页面（此页面）顶端找到绿色的 ``<> Code`` 按钮，点击 ``Download ZIP``.
2. 将压缩包中的内容解压到任意目录。
3. 准备和风天气API Key：  

    (1) 打开[和风天气开发服务官网](https://dev.qweather.com/)，按照引导进行注册和登录。

    (2) 打开[和风天气开发控制台](https://console.qweather.com/home)，在左侧点击 ``项目管理``，点击 ``新建项目``，起一个自己喜欢的名字，点击 ``保存``。

    (3) 回到 ``项目管理``，点击刚才创建的项目。

    (4) 在 ``凭据`` 处点击  ``创建凭据``，起一个自己喜欢的名字， ``身份认证方式`` 选择 ``API KEY``，其余选项全部默认，点击 ``保存``。

    (5) 回到你的项目页面，点击刚才创建的凭据，复制 ``API KEY``中的内容。
> [!IMPORTANT]
> 请妥善保存你的API KEY，不要向任何人透露。

    (6) 和风天气API Key准备完毕。
4. 进行组件配置。打开目录下的 ``Components`` 文件夹，按照引导进行编辑：  

    (1) 打开 ``Components/Shutdown`` 文件夹，打开其中的 ``config.json``.  

    (2) 照葫芦画瓢地修改 ``ShutDownTimes`` 中的内容。具体如下：

    ````json
    { <-每一个关机时间点都应该被大括号包裹。
        "Time": "23:30",  <-这里是关机时间，24小时制。注意冒号为英文。
        "When": "EVERYDAY" <-这里可选"EVERYDAY"(每天)、"WORKDAYS"(工作日)、"WEEKENDS"(双休日)。
    },
    ````

    (3) 打开 ``Components/Timetable``，打开其中的 ``config.json``.

    (4) 同样照葫芦画瓢：

    ````json
    {
        "Classes": {    <-这里是每天的课表，每对引号内写一节课。一天有几节就写几节。
            "1": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],   <-这是周一，其他星期则对应。
            "2": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            "3": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            "4": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            "5": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            "6": ["1", "2", "3", "4", "5", "6", "7", "8"],
            "7": ["1", "2", "3", "4", "5", "6", "7", "8"]
        },
        
        |这里的时间对应的是课表组件高亮显示课程的时间（见文档头图最右侧），
        |到时间时则高亮显示对应的课。
        ↓ 这里从上往下数对应上面"Classes"中周一至周五每天从左往右数。
        "Timetable_Normal": [   <-工作日（周一至周五）的作息时间。
            "08:00",
            "08:40",
            "09:30",
            "10:50",
            "11:30",
            "12:20",
            "13:30",
            "14:40",
            "15:30",
            "16:35"
        ],

        "Timetable_Weekends": [     <-双休日（周六和周天）的作息时间。
            "07:50",
            "08:40",
            "09:40",
            "10:40",
            "13:50",
            "14:50",
            "15:50",
            "16:50"
        ],

        ↓ 一天结束的时间，这个时间以后显示下一天的课表。
        "Time_when_Day_Ends_Normal": "17:25",   <-工作日
        "Time_when_Day_Ends_Weekends": "17:25"  <-双休日
    }
    ````

    (5) 打开 ``Components/Weather``，打开其中的 ``config.json``.

    (6) 把其中 ``City`` 对应的值改为你所在的城市，``API_Key`` 对应的值改为你刚刚获取的API Key.

    (7) 每个组件都包含一个 ````component.json````，其中 ``Size`` 表示该组件的大小和位置，按照一个虚拟的定位网格（由 ``framework/statics/js/positionGrid.js`` 定义）进行。这里不做过多赘述，感兴趣可以自行摸索。

    (8) 组件配置结束。

5. 打开 ``framework/config.json``，编辑 ``Styles`` 下的内容。其中每项说明如下：

    ````json
    "Styles": {
        "MainColor": "#48b3ff",       <-主题色，为十六进制颜色。
        "ColorScheme": "analogous",   <-配色模式，支持"analogous"邻近色或"complementary"互补色。
        "BackgroundMode": "light"     <-明/暗主题切换，"light"明，"dark"暗。
    }
    ````

6. 运行 ``setup.bat``，程序将会自动进行其他配置并设置开机自启动。
7. 下载安装任意支持网页的壁纸引擎，如[Sucrose Wallpaper Engine](https://taiizor.github.io/Sucrose)，新建壁纸，模式选为URL，URL默认为 ``http://localhost:8080``。
8. 配置完成。如果配置正确，您将看到您的壁纸被更换为Sewepo提供的功能组件。
9. 当需要卸载时，请运行 ``uninstall.bat``。程序会自动关闭开机自启功能。

引用项目
----------

| 名称 | 位置 | 版本 | 官网链接 | 许可证 |
| --- | --- | --- | --- | --- |
| Node.js | /tools/node.exe | v24.14.1 | <https://nodejs.org> | <https://github.com/nodejs/node/blob/main/LICENSE> |
| WinSW | Sewepo.exe | v3.0.0-alpha.11 | <https://github.com/winsw/winsw> | <https://github.com/winsw/winsw/blob/v3/LICENSE.txt> |

版本历史
----------

- 2026/04/25 1.0.0 Sewepo第一个版本。

项目结构
----------

````text
Sewepo/
├─ Components/                  # 组件库，即实际显示内容
├─ framework/                   # Sewepo框架
│  ├─ utils/                    # 一些辅助脚本，如智能配色器
│  ├─ componentHandler.js       # 组件相关
│  ├─ config.json               # Sewepo基础配置文件
│  ├─ configHandler.js          # 配置文件相关
│  ├─ initalizer.js             # 初始化器
│  └─ logger.js                 # 日志模块
├─ node_modules/
├─ tools/                       # 包含node.exe
├─ main.js                      # 项目入口
├─ package.json
├─ package-lock.json
├─ README.md
├─ setup.bat                    # 安装脚本
├─ Sewepo.exe                   # WinSW实现自启动
└─ Sewepo.xml                   # WinSW配置文件
````

版权声明
----------

Copyright (c) daniuge233, All Rights Reserved.
Licensed under the [MIT License](https://opensource.org/license/MIT).
