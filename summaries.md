简单总结一下
============

wilddog这个firebase的copy，可以看到拷贝得跟不上进度啊 杯具。

以下描述都是使用免费账号

* websocket基本不能用，都是通过xhr模拟的。
* 后端eventsource非常不稳定，不推送消息。
* 认证：没有尝试成功。
* 在微信中以浏览器模式打开时没正常运行过。

换成firebase

* websocket似乎相当稳定，初始化稍慢，需要1秒左右.
* 然而认证系统依赖google的oauth，简直爆炸.
* customToken并不能作为ID token使用.
* 于是权限全开等于裸奔.
* 尚未尝试在微信中使用.

于是现在系统变成了:

client - listen -> firebase 
       - request-> server

server - push publice data -> firebase
       <- private data ->  local db

理论上server本地不需要一个db，为了节省流量&性能，还是在本地留一个copy比较好。

之后应该把所有in memory的逻辑都移到db上去。

so  what is the next game?