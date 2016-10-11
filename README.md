这是从[chenryn/kibana-authorization](https://github.com/chenryn/kibana-authorization) fork来的一个项目, [chenryn/kibana-authorization](https://github.com/chenryn/kibana-authorization)自带认证功能, 我在上面做过一些改动之后没能及时合并,导致现在已经无力再合并了... 所以现在想新建一个项目, 从头理一下并维护. 删除了原作者的认证功能, 只保留了纯前端的Kibana项目.

在原作者的基础上, 主要是做了兼容ES2.X的Aggs Api的升级. 可以在ES2.X上面继续使用Kibana3.

## 使用

### 打包后使用

如果想打包后使用, 可以 `grunt build --force`, 因为语法规范和dist/app/app.js ugly失败的原因, 必须要加--force.

但是生成的index.html里面引用的rquire.config.js并没有加版本号, 所以还要手工添加.

做为一个前端弱B, 实在不知道应该如何修复.

### 不打包直接用

直接用src里面的内容也是可以的, 毕竟内部使用, 访问量不会多大,网络也不是问题 :) 而且还是单页应用, 不会一直刷静态内容.

如果你会继续N次开发又担心缓存问题, 可以把src/app/components/require.config.js里面的`urlArgs: 'bust=' + (new Date().getTime())`这行注释打开.
