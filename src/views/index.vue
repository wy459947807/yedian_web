<template>
    <div class="page-index">
        <header class="masthead list-selector">
            <ul class="selector-triggers">
                <li :class="{active:activeLayer=='area'}" @click="activeLayer=activeLayer=='area'?false:'area'"><span class="selector-trigger"><span class="text">{{cityText}}</span></span></li>
            </ul>
            <form class="search-form" @submit.prevent="doSearch">
                <input type="search" autocomplete="off" placeholder="搜索…" v-model="keyword">
            </form>
            <a v-link="{ name: 'order' }" class="order-link"></a>

            <div class="selector-droplist droplist-filter" v-show="activeLayer=='area'" transition="flip">
                <div class="filter-panels">
                    <ul class="city-list">
                        <li class="gps" :class="{na:!gpsCity.code,active:activeCity==gpsCity}" @click="activeCity=gpsCity">GPS定位：{{gpsCity.name}}</li>

                        <li v-for="city in cityList" :class="{active:activeCity==city}" @click="activeCity=city">{{city.name}}</li>
                    </ul>
                </div>
            </div>
        </header>

        <nav class="shortcuts">
            <a @click="$trackEvent('Index', 'Click', 'Nearby')" v-link="{ name: 'list', query: { sort: 'distance' } }"><span class="icon icon-map"></span>附近</a>
            <a @click="$trackEvent('Index', 'Click', 'Hot')" v-link="{ name: 'list' }"><span class="icon icon-hot"></span>热卖</a>
        </nav>

        <section class="banner" v-if="filteredBanners&&filteredBanners.length">
            <div class="banner-inner">
                <simple-slider class="banner-slider" :slides="filteredBanners" :click="handleBanner" :auto="true"></simple-slider>
            </div>
        </section>

        <section class="index-module recommended-ktv">
            <h2><a @click="$trackEvent('Index', 'Click', 'Recommended')" v-link="{ name:'list', query: activeCity && activeCity.code == 440100 ? { event: 'goldpkg' } : null }">人气推荐<span class="arrow"></span></a></h2>
            <div class="scrollable">
                <ul class="ktv-list" :style="{width:list.length*210-10+'px'}">
                    <li class="ktv-item" v-for="ktv in list">
                        <a class="ktv-item-inner" v-link="{ name: 'detail', params: { id: ktv.xktvid }}">
                            <div class="pic" :style="ktv.piclist[0].bigpicurl | backgroundImage"></div>

                            <div class="content">
                                <div class="hd">
                                    <h3 class="name">{{ktv.xktvname}}</h3>
                                    <div class="marks">
                                        <span v-if="ktv.taocan.status" class="mark mark-dang"></span>
                                        <span v-if="ktv.sjq.status" class="mark mark-quan"></span>
                                        <span v-if="ktv.miandan.status" class="mark mark-mian"></span>
                                    </div>
                                </div>
                                <div class="meta">
                                    <span class="distance" v-if="ktv.distance != null">{{ktv.distance}}km / </span><span class="rating"><span class="full"></span><span class="stars" :style="{width:ktv.rate*20+'%'}"></span></span>
                                </div>
                            </div>

                            <span class="fav" @click.prevent="doFavorite(ktv)" :class="{added: ktv.favorite}"></span>
                        </a>
                    </li>
                </ul>
            </div>
        </section>

        <section class="index-module index-events" v-if="filteredEvents&&filteredEvents.length">
            <h2>精彩活动</h2>
            <div class="scrollable">
                <ul class="event-list" :style="{width:filteredEvents.length*210-10+'px'}">
                    <li v-for="event in filteredEvents">
                        <a @click="handlePoster(event)">
                            <img class="pic" :src="event.pic" />
                        </a>
                    </li>
                </ul>
            </div>
        </section>

        <loading v-show="status==PAGE_STATUS.LOADING" :inline-mode="list.length>0"></loading>
        <screen-message v-if="status==PAGE_STATUS.FAILED" :inline-mode="list.length>0" message="加载失败, 点击重试" :info="errorMsg" @click="fetch"></screen-message>

        <div class="dimmer" v-show="activeLayer" @click="activeLayer=false" transition="fade"></div>
    </div>
</template>

<style lang="sass">
@import "../scss/variables";
@import "../scss/mixins";

.page-index {
    .masthead {
        position: relative;
        display: flex;
        align-items: center;

        .selector-triggers {
            margin-right: 5px;
            width: 70px;

            li {
                float: none;
                width: auto;

                &:after {
                    display: none;
                }
            }
        }

        .search-form {
            position: static;
            flex: 1;
            height: 24px;
            padding: 0;

            input {
                background: #fff url(../img/icons/icon-search.svg) no-repeat 5px 50%;
                background-size: 18px 18px;
                box-shadow: none;
                height: 100%;
                padding-left: 30px;
                color: #000;
            }
        }
        .order-link {
            width: 44px;
            height: 100%;
            text-align: center;
            background: url(../img/icons/icon-order.svg) no-repeat 50%;
            background-size: 18px auto;
        }
    }

    .shortcuts {
        display: flex;
        height: 44px;

        a {
            position: relative;
            width: 50%;
            text-align: center;
            line-height: 44px;

            &:after {
                content: '';
                position: absolute;
                right: 0;
                top: 20%;
                height: 60%;
                border-right: 1px solid $grayBg;
            }

            &:last-child {
                &:after {
                    display: none;
                }
            }

            .icon {
                width: 22px;
                height: 22px;
                background: no-repeat 50%;
                background-size: contain;
                margin-right: 7px;
                vertical-align: -6px;
            }
            .icon-map { background-image: url(../img/icons/icon-map.svg) }
            .icon-hot { background-image: url(../img/icons/icon-hot.svg) }
        }
    }

    .banner {
        background: $bgDark;
        margin-bottom: 5px;

        .banner-inner {
            position: relative;
            padding-bottom: 42.66%;
        }
    }

    .banner-slider {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;

        .slider-indicators {
            bottom: 5px;

            span {
                background: $bgDark;

                &.active {
                    background: $primary;
                }
            }
        }
    }
}

.index-module {
    margin-bottom: 5px;
    background: $bgLight;
    overflow: hidden;

    h2 {
        font-weight: normal;
        text-align: center;
        font-size: 18px;
        margin: 1em 0;

        .arrow {
            position: relative;
            width: 16px;
            height: 16px;
            display: inline-block;
            background: $primary;
            border-radius: 50%;
            vertical-align: -2px;
            margin-left: .5em;

            &:after {
                content: '';
                position: absolute;
                top: 5.5px;
                left: 4.5px;
                width: 4px;
                height: 4px;
                border-right: 1px solid #fff;
                border-top: 1px solid #fff;
                transform: rotate(45deg);
            }
        }
    }

    .scrollable {
        margin-bottom: 10px;
        overflow: auto;
        @include scrollable;

        ul {
            padding-left: $gap;
            padding-right: $gap;
            @include clearfix;
        }
        li {
            float: left;
            width: 200px;
            margin-left: 10px;
            border-bottom: none;

            &:first-child {
                margin-left: 0;
            }
        }
        a {
            display: block;
        }
    }
}

.recommended-ktv {
    .ktv-list {
        a {
            padding: 0;
        }

        .pic {
            float: none;
            width: 100%;
            max-width: none;
            margin-right: 0;
            margin-bottom: 10px;
        }

        .content {
            margin-right: 0;
        }

        .hd {
            display: flex;
            justify-content: space-between;
        }

        .name {
            @include ellipsis;
        }

        .marks {
            white-space: nowrap;
        }

        .fav {
            position: absolute;
            top: 0;
            right: 0;
            width: 34px;
            height: 34px;
            background: url(../img/icons/icon-favorite.svg) no-repeat 50%;
            background-size: 20px auto;

            &.added {
                background-image: url(../img/icons/icon-favorite-filled.svg);
            }
        }
    }
}

.index-events {
    margin-bottom: 0;
    padding-bottom: 20px;

    .scrollable {
        padding: 15px 0;
        margin: -15px 0;        
    }

    .event-list {
        a {
            transition: .3s;
            &:hover {
                box-shadow: 0 2px 15px rgba(#000, 0.7);
            }
        }

        .pic {
            display: block;
            width: 100%;
        }
    }
}
</style>

<script>
import utils from "../libs/utils";
import store from "../libs/store";
import Vue from "vue";
import { PAGE_STATUS } from "../constants/index";

export default {
    data() {
        return {
            activeLayer: false,

            cityList: [],
            gpsCity: {
                name: "正在定位…"
            },
            activeCity: null,

            banners: store.baseinfo.banner.lists || [],
            events: store.baseinfo.poster.lists || [],

            list: [],

            keyword: "",

            status: 1,
            errorMsg: "",

            PAGE_STATUS
        }
    },
    route: {
        data() {
            utils.getLocation(null, null, coords => {
                this.getCityList().then(function() {
                    if (store.city) {
                        this.activeCity = this.cityList.filter(item => item.code == store.city)[0];
                        this.gpsCity.name = store.gpsCity;
                    } else {
                        return utils.reverseGeocodeLocation(coords, this).then(function(city) {
                            if (this.isCityAvailable(city)) {
                                city.code = this.cityList.filter(item => item.name == city.name)[0].code;
                                this.activeCity = this.gpsCity = city;
                                store.city = this.activeCity.code;
                                store.gpsCity = city.name;
                            } else {
                                store.gpsCity = this.gpsCity.name = city.name;
                                throw new Error("检测到您当前城市没有可预订的KTV，是否手动切换城市？");
                            }
                        }, error => {
                            store.gpsCity = this.gpsCity.name = "定位失败";
                            throw new Error("系统检测不到当前位置信息，是否需要手动切换城市？");
                        }).catch(error => {
                            this.activeCity = this.cityList[0];
                            store.city = this.activeCity.code;

                            if (this.cityList.length > 1) {
                                (window.splashAdPromise || Vue.Promise.resolve()).then(() => {
                                    if (confirm(error.message)) this.activeLayer = "area";
                                });
                            }
                        });
                    }
                }).then(function() {
                    this.fetch();

                    this.$watch("activeCity", function(value) {
                        this.updateList();
                        this.activeLayer = false;
                        store.city = value.code;
                    });
                });
            });
        }
    },
    ready() {
        if (this.$route.query.fromTabBar) window.scrollTo(0, 0);
    },
    methods: {
        fetch() {
            if (this.coords) {
                this.fetchByDistance();
            } else {
                this.fetchCoords().then(function() {
                    this.fetchByDistance();
                });
            };
        },
        fetchByDistance() {
            this.status = PAGE_STATUS.LOADING;

            let items = this.coords || [];

            if (this.activeCity.code == 440100) items = items.filter(item => item.taocan);
            items = items.slice(0, 20);

            this.$api.post("booking/Xktvlist", {
                city: this.activeCity.code,
                best: "distance",
                list: items.map(item => item.xktvid)
            }, true).then(function (data) {
                data.list.forEach(item => {
                    item.distance = utils.getDistance(item.lat, item.lng);
                    item.favorite = this.$user.collectionids.indexOf(item.xktvid) > -1;
                });
                this.list = this.list.concat(data.list.filter(item => item.piclist[0].bigpicurl).slice(0, 5));
                this.status = PAGE_STATUS.COMPLETED;
            }, function (data) {
                this.errorMsg = data.msg;
                this.status = PAGE_STATUS.FAILED;
            });
        },
        fetchCoords() {
            this.status = PAGE_STATUS.LOADING;

            return this.$api.get("booking/xktvcoords", {
                city: this.activeCity.code
            }, true).then(function(data) {
                data.list.forEach(function(item) {
                    item.distance = utils.getDistance(item.lat, item.lng);
                });
                data.list.sort(function(a, b) {
                    return a.distance - b.distance;
                });
                this.coords = data.list;
                this.status = PAGE_STATUS.DONE;
            }, function(data) {
                this.errorMsg = data.message;
                this.status = PAGE_STATUS.FAILED;
            });
        },
        doSearch() {            
            this.$router.go({
                name: "search",
                query: {
                    q: this.keyword
                }
            });
        },
        updateList() {
            this.status = PAGE_STATUS.DONE;
            this.list = [];
            this.page = this.offset = 0;
            this.coords = null;
            this.fetch();
        },
        getCityList() {
            return this.$api.get("booking/CityList", {}, true).then(function(data) {
                this.cityList = data.lists.map(function(item) {
                    return {
                        name: item.name,
                        code: item.area_id
                    }
                });
            });
        },
        isCityAvailable(target) {
            return this.cityList.some(city => target.name == city.name);
        },
        handleBanner(link) {
            this.$handleLink(link, "Banner");
        },
        handlePoster(event) {
            this.$handleLink(event.link, "Events");
        },
        doFavorite(ktv) {
            let id = ktv.xktvid;
            let add = this.$user.collectionids.indexOf(id) == -1;

            this.$api.post("user/" + (add ? "addcollection" : "delcollection"), {
                xktvid: id
            }).then(function(data) {
                if (add) {
                    this.$user.collectionids += "," + id;
                } else {
                    this.$user.collectionids = this.$user.collectionids.replace(id, "");
                };
                ktv.favorite = add;
            });
        }
    },
    computed: {
        cityText() {
            return this.activeCity ? this.activeCity.name : "城市";
        },
        filteredBanners() {
            return this.activeCity ? this.banners.filter(banner => banner.area.indexOf(this.activeCity.code) > -1) : this.banners;
        },
        filteredEvents() {
            return this.activeCity ? this.events.filter(event => event.area.indexOf(this.activeCity.code) > -1) : this.events;
        }
    },
    watch: {
        activeLayer(show) {
            document.body.classList.toggle("no-scroll", show);
        }
    }
}
</script>