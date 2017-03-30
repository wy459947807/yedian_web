import Vue from "vue";
import VueRouter from "vue-router";
import VueResource from "vue-resource";
import VueApi from "./plugins/vue-api";
import VueUser from "./plugins/vue-user";
import VueStats from "./plugins/vue-stats";
import VueWeChat from "./plugins/vue-wechat";
import VuewHelper from "./plugins/vue-helper";
import filters from "./filters";
import directives from "./directives";
import wechat from "./libs/wechat";
import store from "./libs/store";
import utils from "./libs/utils";

Vue.use(VueRouter);
Vue.use(VueResource);
Vue.use(VueApi);
Vue.use(VueUser);
Vue.use(VuewHelper);

Vue.http.headers.common["X-KTV-Application-Name"] = "eec607d1f47c18c9160634fd0954da1a";
Vue.http.headers.common["X-KTV-Vendor-Name"] = "1d55af1659424cf94d869e2580a11bf8";
Vue.http.headers.common["X-KTV-Application-Platform"] = "1";

let App = Vue.extend(require("./views/app.vue"));

let componentsReq = require.context("./components/", false, /\.vue$/);
componentsReq.keys().forEach(function(path) {
    Vue.component(path.match(/\.\/(.*?)\.vue/)[1], Vue.extend(componentsReq(path)));
});

Object.keys(filters).forEach(function(id) {
    Vue.filter(id, filters[id]);
});

Object.keys(directives).forEach(function(id) {
    Vue.directive(id, directives[id]);
});

let router = new VueRouter({
    hashbang: true
});

router.map({
    "/": {
        name: "index",
        title: "夜点娱乐",
        component: require("./views/index.vue")
    },
    "/ktv": {
        name: "list",
        title: "夜点娱乐",
        component: require("./views/ktv-list.vue")
    },
    "/ktv/:id": {
        name: "detail",
        hideBar: true,
        component: require("./views/ktv-detail.vue")
    },
    "/ktv/:id/map": {
        name: "map",
        hideBar: true,
        component: require("./views/map.vue")
    },
    "/book": {
        name: "book",
        title: "包房预订",
        hideBar: true,
        component: require("./views/book.vue")
    },
    "/book/:id": {
        name: "book-result",
        title: "包房预订",
        hideBar: true,
        component: require("./views/book-result.vue")
    },
    "/search": {
        name: "search",
        hideBar: true,
        component: require("./views/search.vue")
    },
    "/order": {
        name: "order",
        title: "我的订单",
        component: require("./views/order.vue"),
        subRoutes: {
            "/ktv": {
                component: require("./views/order-ktv.vue")
            },
            "/gift": {
                component: require("./views/order-gift.vue")
            }
        }
    },
    "/order/ktv/:id": {
        name: "ktv-order",
        title: "我的订单",
        hideBar: true,
        component: require("./views/order-ktv-detail.vue")
    },
    "/order/gift/:id": {
        name: "gift-order",
        title: "兑换成功",
        hideBar: true,
        component: require("./views/order-gift-detail.vue")
    },
    "/store": {
        name: "store",
        title: "礼品兑换",
        component: require("./views/store.vue")
    },
    "/store/:id": {
        name: "gift",
        title: "礼品兑换",
        hideBar: true,
        component: require("./views/gift.vue")
    },
    "/user": {
        name: "user",
        title: "个人中心",
        component: require("./views/user.vue")
    },
    "/user/favorite": {
        name: "favorite",
        title: "我的收藏",
        component: require("./views/favorite.vue")
    },
    "/coupon": {
        name: "coupons",
        title: "我的兑酒券",
        component: require("./views/coupon-list.vue")
    },
    "/view/order/:id": {
        name: "view-ktv-order",
        hideBar: true,
        component: require("./views/ktv-order.vue")
    },
    "/order/coupon/:id": {
        name: "order-coupon",
        hideBar: true,
        component: require("./views/order-ktv-coupon.vue")
    },
    "/wechat": {
        component: {}
    }
});

router.redirect({
    "/order": "/order/ktv",
    "*": "/"
});

router.beforeEach(function(transition) {
    if (transition.to.path === "/wechat") {
        if (transition.from.path && window.isWXReady) {
            wx.closeWindow();
        } else {
            transition.abort();
        };
    } else {
        transition.next();
    }
});

router.afterEach(function(transition) {
    if (transition.to.title) document.title = transition.to.title;
});

Vue.use(VueStats, router);
Vue.use(VueWeChat, router);

function showSplashAd({ pic, link }) {
    return new Vue.Promise(function(resolve) {
        let el = document.createElement("div");
        let timerId;

        function next(skip) {
            document.body.removeChild(el);
            clearTimeout(timerId);
            window.splashAdPromise = null;
            if (skip) resolve();
        }

        el.id = "splash-ad";
        el.style.backgroundImage = "url(" + pic + ")";

        if (link) {
            el.onclick = function() {
                if (link.indexOf("#!") === 0) {
                    router.go(link.substring(2));
                    next(true);
                } else {
                    setTimeout(function() {
                        location.href = link;
                    }, 100);
                }
                Vue.trackEvent("Splash", "Click", link);
            };
        }

        document.body.appendChild(el);

        timerId = setTimeout(next, 2e3);
    });
}

function wechatLogin(userData, noAuth) {
    Vue.api.oAuthLogin({
        type: "wechat",
        openid: userData.openid,
        display_name: userData.display_name,
        avatar_url: userData.avatar_url
    }).then(function() {
        return Vue.Promise.all([
            Vue.api.get("app/baseinfo").then(data => store.baseinfo = data.baseinfo),
            Vue.api.getUserInfo()
        ]);
    }).then(function(data) {
        let hash = location.hash;

        if (typeof wx !== "undefined") wechat.init_jssdk();
        trak.init(store.jsinfo.appid);
        trak.options.openId = userData.openid;
        if (process.env.NODE_ENV !== "production") trak.options.debug = true;

        trak.event({category: "", action: "", data: data[1]});

        if (!noAuth) {
            if ((/micromessenger/i).test(navigator.userAgent)) {
                history.replaceState(null, null, "#!/wechat");
                history.pushState(null, null, hash);
            }

            if (hash && hash != "#!/" && hash.indexOf("#!/?") == -1) {
                history.replaceState(null, null, "#!/");
                history.pushState(null, null, hash);
            }
        }

        if (process.env.NODE_ENV !== "production" || hash.length > 3) {
            router.start(App, "app");
        } else {
            if (store.baseinfo.splash) {
                window.preloadSplashAdImg = new Image();
                window.preloadSplashAdImg.src = store.baseinfo.splash.pic;
            }

            setTimeout(function() {
                if (store.baseinfo.splash) {
                    window.splashAdPromise = showSplashAd(store.baseinfo.splash);
                }
                setTimeout(function() {
                    router.start(App, "app");
                }, store.baseinfo.splash ? 1e3 : 0);
            }, window.performance ? 1e3 - (Date.now() - window.performance.timing.domLoading) : 1e3);
        }
    }).catch(error => alert(error.msg || error.message || "加载失败"));
}

Vue.http.get((process.env.NODE_ENV !== "production" ? "http://yddev.ye-dian.com" : location.origin) + "/app/jsbaseinfo")
.then(response => response.json())
.then(function(data) {
    if (data.result === 0) {
        Vue.http.options.root = data.jsinfo.domain = location.protocol + "//" + data.jsinfo.domain + "/";
        store.jsinfo = data.jsinfo;
        return data.jsinfo;
    } else {
        throw new Error(data);
    }
}).then(function() {
    // just for debugging
    if (process.env.NODE_ENV !== "production") {
        Vue.config.debug = true;
        window.Vue = Vue;
        window.router = router;
        window.$ = jQuery;
        window.trak = {
            init: console.log.bind(console, "trak.init"),
            event: console.log.bind(console, "trak.event"),
            options: {}
        };

        wechatLogin({
            "openid": "oL8b5wuyRyzs8vKX9dMlfMkUQ4C0",
            "display_name": "小影",
            "avatar_url": ""
        });
    } else if (utils.getCookie("openid")) {
        if (location.search || /\?(#|$)/.test(location.href)) {
            wechatLogin({ openid: utils.getCookie("openid") }, true);
        } else {
            location.replace("?" + location.hash);
        }
    } else {
        wechat.authenticate(wechatLogin, data => alert(data.msg || JSON.stringify(data)));
    }
}).catch(error => alert(error.msg || error.message || "Failed to get app/jsbaseinfo"));