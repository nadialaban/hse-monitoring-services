<template>
    <div id="chart-container" v-if="options.graph">

        <h4>{{ options.graph.title }}</h4>
        <filter-panel :page="options.graph_type == 'line' ? 'graph' : (options.graph_type == 'day-line' ? 'day-graph' :
        (options.graph.categories && options.graph.categories.includes('symptom') ? 'symptoms-' : '') + options.graph_type)"
                      :disable_downloading="no_data || options.exporting" :patient="patient"/>

        <!-- Основная часть -->
        <loading v-if="!options.loaded && !errors.length"/>
        <div v-else>
            <div v-if="no_data" class="content-container">
                <p style="text-align: center"><img :src="images.nothing_found"/></p>

                <p style="text-align: center">
                    <small>Нет данных за выбранный период.</small>
                </p>
            </div>

            <highcharts :constructor-type="'stockChart'" :options="graph_options"
                        style="padding-left: -15px; padding-right: -15px;" v-else/>
            <!-- Ошибки -->
            <error-block :errors="errors" v-if="errors.length"/>

            <!-- Табличка -->
            <div class="center" v-if="options.graph_type == 'line' && this.statistics.length  && !no_data">
                <h5 class="text-center">Значения показателей за выбранный период</h5>

                <table class="table table-hover" v-if="!mobile">
                    <colgroup>
                        <col span="1" style="width: 55%;">
                        <col span="1" style="width: 15%;">
                        <col span="1" style="width: 15%;">
                        <col span="1" style="width: 15%;">
                    </colgroup>

                    <thead>
                    <tr class="table-info">
                        <th scope="col">Показатель</th>
                        <th scope="col">Среднее</th>
                        <th scope="col">Мин</th>
                        <th scope="col">Макс</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr v-for="stat in this.statistics">
                        <th scope="row" style="text-align: left;">{{ stat.name }}</th>
                        <td>{{ stat.avg.toFixed(2) * 1 }}</td>
                        <td>{{ stat.min.toFixed(2) * 1 }}</td>
                        <td>{{ stat.max.toFixed(2) * 1 }}</td>
                    </tr>
                    </tbody>
                </table>

                <div v-else-if="options.graph_type == 'line'" v-for="stat in statistics">
                    <hr>
                    <h6 class="text-center">{{ stat.name }}</h6>
                    <table class="table table-hover">
                        <thead>
                        <tr class="table-info">
                            <th scope="col" >Среднее</th>
                            <th scope="col" >Мин</th>
                            <th scope="col">Макс</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>{{ stat.avg.toFixed(2) * 1 }}</td>
                            <td>{{ stat.min.toFixed(2) * 1 }}</td>
                            <td>{{ stat.max.toFixed(2) * 1 }}</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Табличка с симптомами -->
            <div class="center" v-if="options.graph_type == 'line' && list_data.length">
                <h5 class="text-center">Симптомы и события</h5>
                <records-list :data="list_data"/>
            </div>
            <!-- Для экспорта -->
            <div v-show="false">
                <div ref="to-export">
                    <h4>Отчет по мониторингу пациента {{ patient.name }} ({{ patient.birthday }})</h4>
                    <span><strong>Период: </strong>{{
                            options.dates[0] ? ` с ${options.dates[0].toLocaleDateString()}` : ''
                        }} {{ options.dates[1] ? ` по ${options.dates[1].toLocaleDateString()}` : '' }}</span>
                    <hr>

                    <highcharts :constructor-type="'stockChart'" :options="export_options"
                                style="margin-left: 20px"/>

                    <div class="center" v-if="options.graph_type == 'line' && this.statistics.length">
                        <h6>Значения показателей за выбранный период</h6>
                        <table class="table table-hover">
                            <colgroup>
                                <col span="1" style="width: 55%;">
                                <col span="1" style="width: 15%;">
                                <col span="1" style="width: 15%;">
                                <col span="1" style="width: 15%;">
                            </colgroup>
                            <thead>
                            <tr class="table-info">
                                <th scope="col">Показатель</th>
                                <th scope="col">Среднее</th>
                                <th scope="col">Мин</th>
                                <th scope="col">Макс</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="stat in this.statistics">
                                <th scope="row" style="text-align: left;">{{ stat.name }}</th>
                                <td>{{ stat.avg.toFixed(2) * 1 }}</td>
                                <td>{{ stat.min.toFixed(2) * 1 }}</td>
                                <td>{{ stat.max.toFixed(2) * 1 }}</td>
                            </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Табличка с симптомами -->
                    <div class="center" v-if="options.graph_type == 'line' && !no_data ">
                        <h5 class="text-center">Симптомы и события</h5>
                        <records-list :data="list_data" :to_export="true"/>
                    </div>

                </div>
            </div>

        </div>
    </div>
</template>

<script>
import {Chart} from 'highcharts-vue'
import Highcharts from "highcharts";
import stockInit from 'highcharts/modules/stock'
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
import 'vue2-datepicker/locale/ru';
import * as moment from "moment/moment";
import ErrorBlock from "./parts/ErrorBlock";
import Loading from "./parts/Loading";
import boost from "highcharts/modules/boost";
import heatmap from "highcharts/modules/heatmap";
import 'highcharts/modules/heatmap.src.js';
import FilterPanel from "./parts/FilterPanel";
import html2pdf from "html2pdf.js";
import arearange from 'highcharts/highcharts-more';
import RecordsList from "./parts/RecordsList";

stockInit(Highcharts)
heatmap(Highcharts);
boost(Highcharts)
arearange(Highcharts);

export default {
    name: "GraphPresenter",
    components: {RecordsList, FilterPanel, Loading, ErrorBlock, highcharts: Chart, DatePicker},
    props: ['patient', 'last_date'],
    data() {
        return {
            errors: [],
            options: {
                loaded: false,
                graph: undefined,
                dates: undefined,
                graph_type: undefined,
                show_legend: true,
                collapse_points: undefined,
                exporting: false,
            },
            records: [],
            records_by_categories: undefined,
            graph_options: {},
            export_options: {},
            heatmap_data: {},
            collapsed_data: {},
            statistics: [],
            export_chart: undefined,
            text_categories: ['symptom', 'medicine', 'patient_comment', 'information']
        }
    },
    computed: {
        list_data() {
            if (this.no_data) return []

            return this.records.filter(record =>
                this.text_categories.includes(record.category_info.name))
        },
        no_data() {
            if (!this.records) return false
            if (this.options.graph_type != 'heatmap')
                return !(this.records.filter(record =>
                    !this.text_categories.includes(record.category_info.name)).length)
            return !(this.records.length)
        }
    },
    methods: {
        load: function (first_load) {
            this.options.loaded = false
            this.errors = []

            // Добавляю текстовые категории
            let categories = this.options.graph.categories
            //
            // if (this.options.dates[0])
            //     this.options.dates[0] = this.start_of_day(this.options.dates[0])
            // if (this.options.dates[1])
            //     this.options.dates[1] = this.end_of_day(this.options.dates[1])
            let dates = this.options.dates.map(date => date ? date.getTime() / 1000 : date)
            let options = {
                type: this.options.graph_type,
                first_load: first_load,
            }

            this.load_data(categories, dates, options)
        },
        process_load_answer: function () {
            this.graph_options = this.get_options()

            if (!this.no_data) {
                this.export_options = JSON.parse(JSON.stringify(this.graph_options))
                this.export_options.chart.events.render = function (event) {
                    Event.fire('set-export-chart', this)
                }

                this.export_options.title.align = 'left'

                this.export_options.chart.width = 700
                this.export_options.chart.backgroundColor = '#ffffff'

                if (this.options.graph_type.includes('line')) {
                    this.export_options.legend.width = '100%'
                    this.export_options.chart.height = 450

                    this.export_options.series.forEach(series => {
                        series.data.forEach(val => {
                            if (val.marker && val.marker.symbol && val.marker.symbol.includes('url')) {
                                val.marker.symbol = 'circle'
                                val.marker.fillColor = '#FF0000'
                            }
                        })
                    })
                } else {
                    this.export_options.xAxis.labels.style = {
                        fontSize: '10px'
                    }
                    this.export_options.yAxis[0].labels.style = {
                        fontSize: '10px'
                    }
                }
            }

            this.graph_options.title = undefined

            this.options.loaded = true
        },
        get_options: function () {
            let start = this.options.dates[0] ?
                this.options.dates[0].getTime() :
                this.records[this.records.length - 1].timestamp * 1000

            let end = this.options.dates[1] ?
                this.options.dates[1].getTime() :
                this.records[0].timestamp * 1000

            let day_diff = this.dates_difference(new Date(start), new Date(end))

            let options = {
                chart: this.get_chart(),
                accessibility: {
                    enabled: false
                },
                series: [],
                title: {
                    text: this.options.graph.title +
                        (this.options.graph_type == 'day-line' ? ' (суточный график)' : '')
                },
                xAxis: {
                    type: 'datetime',
                    gridLineWidth: 1,
                    minorGridLineWidth: 2,
                    minorTickLength: 0,
                    minorTickInterval: this.day,
                    min: start,
                    max: end + 60 * 60 * 1000,
                    ordinal: false,
                    dateTimeLabelFormats: {
                        day: '%d.%m',
                        hour: '%H:%M'
                    }
                },
                yAxis: [
                    this.get_y_axis(0),
                    this.get_y_axis(1)
                ],
                tooltip: {
                    formatter: function () {
                        let point = this.point ? this.point : this.points[0];
                        return point.comment
                    },
                    pointFormatter: function () {
                        let point = this;
                        return point.series.userOptions.data.filter(p => p.x == point.x).map(p => {
                            return p.comment
                        }).join('<br>')
                    },
                    style: {
                        width: this.mobile ? Math.ceil(window.innerWidth * 0.8) + 'px' : undefined
                    },

                    positioner: function () {
                        return {x: 10, y: 10};
                    },
                    shadow: false,
                    backgroundColor: 'rgba(255,255,255,0.8)',

                    shared: true,
                    headerFormat: null
                },
                legend: {},
                plotOptions: {},
                rangeSelector: {
                    enabled: false,
                },
                navigator: {
                    enabled: this.options.graph_type == 'line',
                },
                scrollbar: {
                    enabled: false
                }
            }

            if (this.options.graph_type.includes('line')) {
                options.chart.height = `${Math.max(window.innerHeight - 230, 500)}px`

                options.colors = this.colors
                options.tooltip.formatter = undefined

                options.plotOptions = {
                    line: {
                        dataLabels: {
                            enabled: true
                        }
                    },
                    series: {
                        marker: {
                            lineWidth: 1,
                            lineColor: null,
                        }
                    }
                }
                options.legend = {
                    enabled: this.options.show_legend,
                    itemDistance: 70,
                    labelFormatter: function () {
                        return this.name
                    }
                }

                if (!this.mobile) {
                    options.tooltip.positioner = undefined
                } else {
                    options.chart.height += 100
                }

                let days = this.options.graph_type == 'day-graph'? 1 :
                    Math.ceil((this.options.dates[1] - this.options.dates[0]) / (1000 * 60 * 60 * 24)) + 1
                if (days > 6) {
                    let t = days > 365 ? 30 : (days > 100 ? 10 : (days > 50 ? 5 : (days > 30 ? 2 : 1)))

                    options.xAxis.tickPositioner = function (min, max) {
                        let interval = t * 24 * 36e5, ticks = [], count = 0;

                        while (min < max) {
                            ticks.push(min);
                            min += interval;
                            count++;
                        }

                        ticks.info = {
                            unitName: 'day',
                            count: 5,
                            higherRanks: {},
                            totalRange: interval * count
                        }
                        return ticks;
                    }
                    options.xAxis.labels = {
                        rotation: -45
                    }
                }

            } else {
                options.tooltip.pointFormatter = undefined
                options.tooltip.positioner = undefined

                options.colorAxis = {
                    stops: [
                        [0, '#50B432'], [0.1, '#fcff00'], [1, '#ed341b']
                    ],
                    min: 0,
                    max: 1,
                    startOnTick: false,
                    endOnTick: false,
                    labels: {
                        format: '{value}'
                    }
                }
            }

            options.series = this.get_series(options)

            if (this.options.graph_type == 'heatmap') {
                let count = this.heatmap_data.categories.symptoms.length + this.heatmap_data.categories.medicines.length
                options.chart.height = count * 20 + 80

                options.yAxis[0].categories = this.heatmap_data.categories.symptoms
                options.yAxis[1].categories = this.heatmap_data.categories.medicines

                options.xAxis.labels = {
                    rotation: -45
                }
                options.xAxis.tickmarkPlacement = 'between'
                options.xAxis.tickPositioner = function (min, max) {
                    let interval = 24 * 36e5, ticks = [], count = 0;

                    while (min < max) {
                        ticks.push(min);
                        min += interval;
                        count++;
                    }

                    ticks.info = {
                        unitName: 'day',
                        count: 5,
                        higherRanks: {},
                        totalRange: interval * count
                    }


                    return ticks;
                }

                if (this.options.graph.categories.includes('symptom')) {
                    options.yAxis[0].height = 20 * this.heatmap_data.categories.symptoms.length

                    options.yAxis[1].top = 20 * this.heatmap_data.categories.symptoms.length + 30
                    options.yAxis[1].height = 20 * this.heatmap_data.categories.medicines.length

                    if (!this.heatmap_data.show_medicines || !this.heatmap_data.categories.medicines.length) {
                        this.heatmap_data.axis = options.yAxis.splice(1, 2)
                        let count = this.heatmap_data.categories.medicines.length
                        options.chart.height -= count * 20
                    }
                } else {
                    options.yAxis.splice(0, 1)
                }
            }

            if (this.options.graph_type == 'day-line') {
                let today = new Date()
                today.setHours(5, 0, 0, 0)
                options.xAxis.min = today.getTime() + this.offset * 1000
                options.xAxis.minorTickInterval = 60 * 60 * 1000

                today.setMinutes(30)
                options.xAxis.max = today.getTime() + this.offset * 1000 + this.day
                options.yAxis.splice(1, 2)
            }

            if (this.options.graph_type == 'line' && this.options.graph.categories.includes('glukose'))
                this.set_bands(options)

            return options
        },
        get_series: function (options) {
            let series = []
            series = series.concat(this.get_text_series({
                name: 'symptom',
                description: 'Симптом',
                color: '#ad0eca',
                y: -3
            }))

            if (!(this.options.graph_type == 'heatmap' && this.options.graph.categories.includes('symptom') && !this.heatmap_data.show_medicines)) {
                series = series.concat(this.get_medicine_series())
            }
            if (this.options.graph_type == 'heatmap') {
                this.heatmap_data.medicine_series = this.get_medicine_series()
            }

            if (this.options.graph_type.includes('line')) {
                let graph_series = this.get_line_graph_series()

                let sum_graph = this.records.filter(record => record.category_info.default_representation == 'day_sum').length
                let too_much_points = this.records.length > 500 && !sum_graph

                if (graph_series.length && too_much_points) Event.fire('show-collapse', true)
                else Event.fire('show-collapse', false)

                if (sum_graph) {
                    this.collapse(graph_series, this.collapse_sum_point, this.collapse_sum_series)
                    graph_series = this.collapsed_data
                }

                if (!this.options.collapse_points && this.options.collapse_points != undefined && too_much_points) {
                    this.errors = ['За данный период в медицинской карте присутствует слишком большое количество записей (> 500). ',
                        'Чтобы увидеть комментарии к точкам и симптомы, загрузите период с меньшим количеством записей или усредните значения.']
                    graph_series.forEach(s => {
                        s.data = s.data.map(d => [d.x, d.y])
                    })
                    options.plotOptions.line.dataLabels.enabled = false
                    this.options.collapse_points = false
                } else if ((this.options.collapse_points || this.options.collapse_points == undefined) && too_much_points) {
                    this.errors = ['За данный период в медицинской карте присутствует слишком большое количество записей (> 500). ',
                        'Для удобства мы усреднили значения. Усреднение можно убрать, воспользовавшись галочкой выше, но в таком случае значения будут недоступны.']
                    this.collapse(graph_series, this.collapse_ranges_point, this.collapse_ranges_series)
                    graph_series = this.collapsed_data

                    if (this.options.collapse_points == undefined) Event.fire('set-collapse-mode', true)
                    this.options.collapse_points = true

                    options.plotOptions.line.dataLabels.enabled = false
                }

                if (this.options.graph_type != 'day-line') {
                    let comment_series = this.get_text_series({
                        name: 'patient_comment',
                        description: 'Комментарий',
                        color: '#0e17ca',
                        y: -5
                    })
                    let info_series = this.get_text_series({
                        name: 'information',
                        description: 'Общая информация',
                        color: '#00ffe1',
                        y: -7
                    })
                    series = comment_series.concat(series)
                    series = info_series.concat(series)
                    series = graph_series.concat(series)
                } else {
                    series = graph_series
                }

                if (this.mobile && series.length > 2)
                    options.chart.height += 50 * (options.series.length - 2)
            }

            return series
        },
        get_line_graph_series: function () {
            if (this.options.graph_type == 'day-line') {
                let today = new Date()
                let today_arr = [today.getFullYear(), today.getMonth(), today.getDate()]
                this.records.forEach((record) => {
                    let date = new Date(record.timestamp * 1000)
                    date.setFullYear(today_arr[0], today_arr[1], today_arr[2])
                    if (date.getHours() < 5) date = this.add_days(date, 1)

                    record.timestamp = date.getTime() / 1000
                })

                this.records = this.records.sort((a, b) => {
                    return a.timestamp > b.timestamp ? -1 : a.timestamp < b.timestamp ? 1 : 0
                })
                this.records_by_categories = this.group_by(this.records, 'category')
            }

            let series = []

            Object.entries(this.records_by_categories).forEach(([category, records]) => {
                if (!this.text_categories.includes(category)) {
                    let series_data = {
                        name: records[0].category_info.description,
                        category_type: records[0].category_info.type,
                        code: category,
                        values: records,
                        marker: 'circle'
                    }
                    series.push(this.prepare_series(series_data))
                }
            })

            return series
        },
        get_medicine_series: function () {
            if (!this.records_by_categories['medicine']) return []
            let medicines = {}
            let series

            if (this.options.graph_type == 'line') {
                let y = -5

                this.records_by_categories['medicine'].forEach((record) => {
                    let dict = {
                        timestamp: record.timestamp,
                        dose: !record.params || record.params.dose == null ? '' : ` (${record.params.dose})`,
                        date: record.formatted_date
                    }
                    if (record.value in medicines)
                        medicines[record.value].push(dict)
                    else
                        medicines[record.value] = [dict]
                });

                series = Object.entries(medicines).map(([medicine, values]) => {
                    let series_data = {
                        name: medicine,
                        code: 'medicine',
                        values: values,
                        marker: 'square',
                        y: y
                    }

                    y -= 4

                    return this.prepare_series(series_data)
                })
            } else if (this.options.graph_type == 'heatmap') {
                let y = 0;

                this.records_by_categories['medicine'].forEach((record) => {
                    let x = this.middle_of_day(new Date((record.timestamp) * 1000))
                    let data = {
                        points: [{
                            time: new Date(record.timestamp * 1000),
                            dose: !record.params || record.params.dose == null ? '' : ` (${record.params.dose})`
                        }],
                        date: record.formatted_date,
                        description: `Прием препарата <strong>"${record.value}"</strong> в `,
                        x: +x,
                    }

                    let group = record.value
                    if (group in medicines) {
                        let old = medicines[group].find(s => s.x == data.x)
                        if (old) {
                            old.points.push(data.points[0])
                        } else {
                            medicines[group].push(data)
                        }
                    } else {
                        medicines[group] = [data]
                    }
                })

                series = Object.entries(medicines).map(([medicine, medicine_data]) => {
                    medicine_data.forEach(data => {
                        data.points.sort((a, b) => {
                            return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
                        })
                        data.points.forEach(p => {
                            data.description += `<br>• <strong>${this.format_time(p.time)}</strong> ${p.dose}`
                        })
                    })

                    let series_data = {
                        name: medicine,
                        code: 'medicine',
                        values: medicine_data,
                        y: y
                    }

                    y += 1
                    return this.prepare_series(series_data)
                });

                this.heatmap_data.medicine_series = series
                this.heatmap_data.categories.medicines = Object.keys(medicines)
            }

            return series
        },
        get_text_series: function (data) {
            if (!this.records_by_categories[data.name]) return []
            let series = []

            if (this.options.graph_type == 'line') {
                let series_data = {
                    name: data.description,
                    code: data.name,
                    color: data.color,
                    values: this.records_by_categories[data.name],
                    marker: 'triangle',
                    y: data.y
                }
                series = [
                    this.prepare_series(series_data)
                ]
            } else if (this.options.graph_type == 'heatmap') {
                let symptoms = {}
                let y = 0;

                this.records_by_categories[data.name].forEach((record) => {
                    let x = this.middle_of_day(new Date((record.timestamp) * 1000))
                    let data = {
                        points: [{
                            time: new Date(record.timestamp * 1000),
                            description: record.value,
                        }],
                        date: record.formatted_date,
                        color: record.params.color != null ? record.params.color : 0.7,
                        description: '',
                        x: +x
                    }

                    let group = record.params.symptom_group ? record.params.symptom_group : record.value
                    if (group in symptoms) {
                        let old = symptoms[group].find(s => s.x == data.x)
                        if (old) {
                            old.color = old.color > data.color ? old.color : data.color
                            old.points.push(data.points[0])
                        } else {
                            symptoms[group].push(data)
                        }
                    } else {
                        symptoms[group] = [data]
                    }
                })

                series = Object.entries(symptoms).map(([symptom, symptom_data]) => {
                    symptom_data.forEach(data => {
                        data.points.sort((a, b) => {
                            return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
                        })
                        data.points.forEach(p => {
                            data.description += `• <strong>${this.format_time(p.time)}</strong> - ${p.description}<br>`
                        })
                    })

                    let series_data = {
                        name: symptom,
                        code: 'symptom',
                        values: symptom_data,
                        y: y
                    }

                    y += 1
                    return this.prepare_series(series_data)
                });

                this.heatmap_data.categories.symptoms = Object.keys(symptoms)
            }

            return series
        },
        prepare_series: function (data) {
            let series = {
                name: data.name,
                category_code: data.code,
                category_type: data.category_type,
                data: this.prepare_values(data),
                showInNavigator: false,
                states: {
                    inactive: {
                        opacity: 1,
                    }
                },
            }

            if (this.options.graph_type.includes('line')) {
                series.marker = {
                    enabled: true,
                    radius: 4,
                    symbol: data.marker
                }

                series.dataGrouping = {
                    enabled: false
                }

                if (this.text_categories.includes(data.code)) {
                    series.yAxis = 1
                    series.lineWidth = 0
                    if (data.code != 'medicine') {
                        series.color = data.color
                        series.marker.radius = 5
                    }
                } else {
                    series.yAxis = 0
                    series.showInNavigator = true
                    series.dashStyle = this.options.graph_type == 'day-line' ? undefined : 'ShortDot'
                    series.lineWidth = 3
                    if (this.options.graph_type == 'day-line') {
                        series.states = {
                            hover: {
                                enabled: false
                            }
                        }
                        series.lineWidth = 0
                    }
                }
            } else {
                series.yAxis = +(this.options.graph.categories.length == 2 && data.code == 'medicine')
                series.colsize = this.day
                series.connectNulls = true

                series.nullColor = 'rgba(80,180,50,0.5)'
                series.borderWidth = 1
                series.borderColor = '#555555'
            }

            return series
        },
        prepare_values: function (data) {
            let res
            if (this.options.graph_type.includes('line')) {
                if (data.code == 'medicine') {
                    res = data.values.map((value) => {
                        return {
                            dataLabels: {
                                enabled: false,
                            },
                            x: (value.timestamp + this.offset) * 1000,
                            y: data.y,
                            comment: this.get_comment({
                                value: data.name + value.dose,
                                timestamp: value.timestamp,
                                date: value.date,
                                time: value.time
                            }, `Прием лекарства`),
                        }
                    })
                } else if (this.text_categories.includes(data.code)) {
                    res = data.values.map((value) => {
                        return {
                            dataLabels: {
                                enabled: false,
                            },
                            x: (value.timestamp + this.offset) * 1000,
                            y: data.y,
                            comment: this.get_comment(value, data.name),
                        }
                    })
                } else {
                    res = data.values.map((value) => {
                        let dl
                        if (this.options.graph_type == 'day-line') {
                            dl = {
                                enabled: true,
                                formatter: function () {
                                    return `${value.value} (${value.date})`
                                }
                            }
                        }
                        return {
                            x: (value.timestamp + this.offset) * 1000,
                            y: value.value,
                            comment: this.get_comment(value, data.name),
                            dataLabels: dl,
                            marker: {
                                symbol: this.get_symbol(value),
                                lineColor: this.get_color(value),
                                radius: this.get_radius(value),
                            }
                        }
                    })
                }
            } else {
                if (data.code == 'symptom') {
                    res = data.values.map(value => {
                        return {
                            dataLabels: {
                                enabled: true,
                                formatter: function () {
                                    return value.points.length != 1 ? value.points.length : ''
                                },
                            },
                            x: value.x,
                            y: data.y,
                            name: data.name,
                            value: value.color,
                            comment: `<strong>${value.date}</strong><br>${value.description}`,
                        }
                    })
                    res = this.fill_nulls(res, data.y)
                } else {
                    res = data.values.map(value => {
                        return {
                            dataLabels: {
                                enabled: true,
                                formatter: function () {
                                    return value.points.length
                                },
                            },
                            x: value.x,
                            y: data.y,
                            name: data.name,
                            color: '#d1f6f6',
                            comment: value.description,
                        }
                    })
                }
            }
            return res.reverse()
        },
        get_y_axis: function (index) {
            let axis = {
                gridLineWidth: 1,
                lineWidth: 2,
                resize: {
                    enabled: true
                },
                offset: index ? 0 : undefined
            }

            if (this.options.graph_type.includes('line')) {
                axis.title = {
                    text: index ? 'События' : 'Значения'
                }

                axis.labels = {
                    align: 'right',
                    x: -5,
                    enabled: !index
                }
                axis.height = index ? '15%' : '80%'
                if (index) axis.top = '85%'
                if (this.options.graph_type == 'day-line') axis.height = '100%'
            } else {
                axis.title = {
                    text: index ? 'Лекарства' : 'Симптомы'
                }

                axis.labels = {
                    align: 'left',
                    y: 5,
                    reserveSpace: true
                }

                axis.height = index ? '100%' : '70%'
                axis.top = '0%'
                axis.offset = 0
            }

            return axis
        },
        get_chart: function () {
            let chart = {
                type: this.options.graph_type != 'day-line' ? this.options.graph_type : undefined,
                boostThreshold: 500,
                turboThreshold: 0,
                animation: false,
                zoomType: this.mobile ? '' : 'x',
                backgroundColor: "#fcfcfc",
                height: `${window.innerHeight - 230}`,
                width: `${window.innerWidth * (this.mobile ? 1 : 0.89)}`,
                renderTo: 'container',
                events: {}
            }

            if (this.options.graph_type == 'line') {
                chart.events = {
                    render: function (event) {
                        let data = {
                            start: event.target.axes[0].min,
                            end: event.target.axes[0].max
                        }
                        Event.fire('refresh-stats', data)
                        Event.fire('set-export-chart-extremes', {
                            start: event.target.axes[0].min,
                            end: event.target.axes[0].max
                        })
                    }
                }
            }

            return chart
        },
        set_bands: function (options) {
            options.yAxis[0].plotBands = [{
                from: 0,
                to: 3,
                color: "rgba(255,117,117,0.25)"
            }, {
                from: 18,
                to: 100,
                color: "rgba(255,117,117,0.25)"
            }, {
                from: 3,
                to: 4,
                color: "rgba(255,209,117,0.25)"
            }, {
                from: 12,
                to: 18,
                color: "rgba(255,209,117,0.25)"
            }, {
                from: 4,
                to: 12,
                color: "rgba(186,255,117,0.25)"
            }]

            let min = null, max = null

            this.axios.get(this.url('/params')).then(response => {
                response.data.forEach(param => {
                    if (param.name && param.value != null) {
                        if (param.code == 'min_glukose' && (min == null || min > param.value))
                            min = param.value
                        if (param.code == 'max_glukose' && (max == null || max < param.value))
                            max = param.value
                    }
                })

                if (min != null) {
                    options.yAxis[0].plotBands[2].to = min
                    options.yAxis[0].plotBands[4].from = min
                }
                if (max != null) {
                    options.yAxis[0].plotBands[3].from = max
                    options.yAxis[0].plotBands[4].to = max
                }
            });
        },
        // Вспомогательные
        get_color: function (point) {
            if (point.additions) {
                return '#FF0000';
            }
            return undefined;
        },
        get_symbol: function (point) {
            if (point.additions) {
                return 'url(' + this.images.warning + ')'
            }
            return undefined;
        },
        get_radius: function (point) {
            if (point.additions) {
                return 6;
            }
            return undefined;
        },
        get_comment: function (point, category) {
            let date = new Date((point.timestamp) * 1000)
            let comment = `${point.date}<br><strong>${this.format_time(date)}</strong> - ${category}: ${point.value}`
            if (point.additions) {
                point.additions.forEach((value) => {
                    comment += `<br><strong style="color: red;">${value['addition']['comment']}</strong>`
                })
            }
            if (point.comments && point.comments.length) {
                comment += `<br><strong>Дополнительная информация:</strong>`
                point.comments.forEach((value) => {
                    comment += `<br>${value.value}`
                })
            }
            return comment
        },
        format_time: function (date) {
            return date.toTimeString().substr(0, 5)
        },
        format_date: function (date) {
            return date.toLocaleDateString()
        },
        fill_nulls: function (data, y) {
            let start = +this.middle_of_day(new Date(this.options.dates[0].getTime()))
            let end = +this.middle_of_day(new Date(this.options.dates[1].getTime()))


            let i = 0
            let res = []

            while (end >= start) {
                if (i >= data.length || end != data[i].x) {
                    res.push({
                        dataLabels: {
                            enabled: true,
                            formatter: function () {
                                return ''
                            },
                        },
                        x: end,
                        y: y,
                        value: null,
                        comment: `Нет данных`,
                    })
                } else {
                    res.push(data[i])
                    i += 1
                }
                end -= this.day
            }
            return res
        },
        generate_report: function () {
            this.options.exporting = true

            let element = this.$refs['to-export']

            let opt = {
                margin: 0.5,
                filename: `${this.options.graph.title}_${this.patient.name}.pdf`,
                page_break: {mode: 'css'},
                html2canvas: {dpi: 192, letterRendering: true},
                jsPDF: {unit: 'in', format: 'letter', orientation: 'portrait'}
            };
            setTimeout(() => {
                this.options.exporting = false;
            }, 5000);
            html2pdf().set(opt).from(element).save();
        },

        collapse: function (graph_series, point_handler, series_handler) {
            this.collapsed_data = []
            let by_hour = this.options.graph_type == 'day-graph' ? true :
                Math.ceil((this.options.dates[1] - this.options.dates[0]) / (1000 * 60 * 60 * 24)) < 4

            graph_series.forEach((graph, i) => {
                let data = []
                graph.data.forEach(val => {
                    let d = new Date(val.x)
                    val.date = this.format_date(d)
                    if (by_hour) val.date += ` ${d.getHours()}:00-${(d.getHours() + 1) % 24}:00`
                })

                let dates = new Set(graph.data.map(val => val.date))
                dates.forEach(date => {
                    let x_date = by_hour ? date : (date + ' 00:00')
                    let points = graph.data.filter(val => val.date == date)
                    let value = {
                        x: +moment(x_date, 'DD.MM.YYYY hh:mm') + (by_hour ? (this.offset + 30 * 60) * 1000 : this.day),
                        marker: {
                            symbol: 'circle',
                            radius: 5
                        }
                    }
                    data.push(point_handler(value, points, date, graph))
                })

                series_handler(graph, data, i)
            })
        },
        collapse_sum_point: function (sum, points, date, graph) {
            sum.y = points.map(val => val.y).reduce((a, b) => a + b, 0)
            sum.comment = `<strong>${date}</strong> - ${graph.name}: ${sum.y}`
            return sum
        },
        collapse_sum_series: function (graph, data, i) {
            let series = {
                name: graph.name,
                type: 'line',
                category_code: graph.category_code,
                category_type: graph.category_type,
                data: data,
                yAxis: 0,
                showInNavigator: true,
                states: {
                    inactive: {
                        opacity: 1,
                    },
                },
                marker: {
                    enabled: true,
                    symbol: 'circle'
                },
                dataGrouping: {
                    enabled: false
                },
                lineWidth: 3,
                dashStyle: 'ShortDot'
            }

            this.collapsed_data.push(series)
        },
        collapse_ranges_point: function (median, points, date, graph) {
            median.count = points.length
            median.y = this.median(points.map(val => val.y))
            let low = Math.min.apply(Math, points.map(val => val.y))
            let high = Math.max.apply(Math, points.map(val => val.y))
            median.comment = `<strong>${graph.name}</strong><br>` +
                `<strong>Дата:</strong> ${date}<br>` +
                `<strong>Количество значений:</strong> ${points.length}<br>` +
                (low != high ? `<strong>Разброс значений:</strong> ${low} - ${high}<br>` : '') +
                `<strong>Медиана:</strong> ${median.y.toFixed(2) * 1}<br>`
            return {median: median, range: [median.x, low, high]}
        },
        collapse_ranges_series: function (graph, data, i) {
            let series = {
                name: graph.name,
                type: 'line',
                category_code: graph.category_code,
                category_type: graph.category_type,
                data: data.map(p => p.median),
                yAxis: 0,
                showInNavigator: true,
                color: this.colors[i],
                states: {
                    inactive: {
                        opacity: 1,
                    },
                },
                marker: {
                    enabled: true,
                    symbol: 'circle'
                },
                dataGrouping: {
                    enabled: false
                },
                lineWidth: 3,
                dashStyle: 'ShortDot'
            }

            this.collapsed_data.push(Object.assign({}, series))
            series.type = 'arearange'
            series.data = data.map(p => p.range)
            series.dashStyle = 'Solid'
            series.marker.radius = 4
            series.linkedTo = ':previous'
            series.opacity = 0.2
            series.states = {
                inactive: {
                    opacity: 0.2,
                },
                hover: {
                    opacity: 0.5
                }
            }
            this.collapsed_data.push(series)
        },

        refresh_stats: function (start, end) {
            let stats = []

            Object.entries(this.records_by_categories).forEach(([category, records]) => {
                if (!this.text_categories.includes(category)) {
                    let visible_values = this.find_visible_records(records, start, end)

                    if (visible_values.length) {
                        // calculate statistics for visible points
                        const max = visible_values.reduce((a, b) => Math.max(a, b))
                        const min = visible_values.reduce((a, b) => Math.min(a, b))
                        let average = visible_values.reduce((a, b) => a + b, 0) / visible_values.length

                        if (records[0].category_info.type == 'integer') {
                            average = Math.ceil(average)
                        }

                        stats.push({
                            name: records[0].category_info.description,
                            code: records[0].category_info.name,
                            data: visible_values,
                            avg: average,
                            min: min,
                            max: max
                        })

                    }
                }
            })

            // Для давления - тут явно надо что-то придумать
            let systolic_pressure = stats.find(st => st.code == 'systolic_pressure')
            let diastolic_pressure = stats.find(st => st.code == 'diastolic_pressure')

            if (systolic_pressure != null && diastolic_pressure != null) {
                let pp_data = []
                let map_data = []
                systolic_pressure.data.forEach((s, index) => {
                    let d = diastolic_pressure.data[index]
                    map_data.push((s - d) / 3 + d)
                    pp_data.push(s - d)
                })

                stats.push({
                    name: 'Среднее давление (MAP)',
                    code: 'map',
                    avg: Math.ceil(map_data.reduce((a, b) => a + b, 0) / map_data.length),
                    min: Math.ceil(map_data.reduce((a, b) => Math.min(a, b))),
                    max: Math.ceil(map_data.reduce((a, b) => Math.max(a, b)))
                })

                stats.push({
                    name: 'Пульсовое давление',
                    code: 'pulse_pressure',
                    avg: Math.ceil(pp_data.reduce((a, b) => a + b, 0) / pp_data.length),
                    min: Math.ceil(pp_data.reduce((a, b) => Math.min(a, b))),
                    max: Math.ceil(pp_data.reduce((a, b) => Math.max(a, b)))
                })
            }

            this.statistics = stats
        },
        find_visible_records: function (records, start, end) {
            let timestamps = records.map(record => record.timestamp * 1000)
            let start_index = this.binary_search(timestamps, start, 0, timestamps.length - 1)
            let end_index = this.binary_search(timestamps, end, 0, timestamps.length - 1)

            return records.slice(start_index, end_index).map(record => record.value)
        },
        median: function (arr) {
            const arrayHalf = arr.length / 2
            const sorted = [].concat(arr).sort((a, b) => a - b)

            return arr.length % 2 === 0
                ? (sorted[arrayHalf] + sorted[arrayHalf + 1]) / 2
                : sorted[~~(arrayHalf)]
        }
    },
    created() {
        this.options.dates = {
            range: [],
            period: 14
        }

        this.colors = ['#058DC7', '#50B432', '#aa27ce', '#fcff00',
            '#24CBE5', '#64E572', '#c355ff', '#fce200', '#6AF9C4']

        Highcharts.setOptions({
            lang: {
                loading: 'Загрузка...',
                months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
                weekdays: ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
                shortMonths: ['Янв', 'Фев', 'Март', 'Апр', 'Май', 'Июнь', 'Июль', 'Авг', 'Сент', 'Окт', 'Нояб', 'Дек'],
                exportButtonTitle: "Экспорт",
                printButtonTitle: "Печать",
                rangeSelectorFrom: "С",
                rangeSelectorTo: "По",
                rangeSelectorZoom: "Период",
                downloadPNG: 'Скачать PNG',
                downloadJPEG: 'Скачать JPEG',
                downloadPDF: 'Скачать PDF',
                downloadSVG: 'Скачать SVG',
                printChart: 'Напечатать график',
                resetZoom: 'Весь график'
            }
        });

        Event.listen('loaded', (data) => {
            if (data.info.type == 'report') return

            if (data.info.first_load) {
                this.options.dates = [
                    new Date(data.info.dates[0] * 1000),
                    new Date(data.info.dates[1] * 1000)
                ]
                Event.fire('set-dates', this.options.dates)
            }

            this.records = data.records.map((record) => {
                record.category = record.category_info.name
                let d = new Date(record.timestamp * 1000)
                record.date = this.format_date(d)
                record.time = this.format_time(d)
                return record
            })
            this.records_by_categories = this.group_by(this.records, 'category')

            this.process_load_answer()
        })

        Event.listen('set-export-chart', (data) => {
            this.export_chart = data
        })
        Event.listen('set-export-chart-extremes', (data) => {
            if (this.export_chart && this.export_chart.axes)
                this.export_chart.axes[0].setExtremes(data.start, data.end)
        });

        Event.listen('load-line-graph', (params) => {
            this.options.graph_type = 'line'
            this.options.graph = params
            this.options.dates = [
                this.start_of_day(this.add_days(this.last_date, -14)),
                this.last_date
            ]
            this.load(true)
        });

        Event.listen('load-day-graph', (params) => {
            this.options.graph_type = 'day-line'
            this.options.graph = params
            this.options.dates = [undefined, this.last_date]
            this.load(true)
        });

        Event.listen('load-heatmap', (params) => {
            this.options.graph_type = 'heatmap'
            this.options.graph = params
            this.options.dates = [undefined, this.last_date]

            this.heatmap_data = {
                medicine_series: [],
                categories: {
                    symptoms: [],
                    medicines: []
                },
                show_medicines: false
            }

            this.load(true)
        });

        Event.listen('refresh-stats', (data) => {
            this.refresh_stats(data.start, data.end)
        })

        Event.listen('window-resized', () => {
                if (this.graph_options.chart) {
                    this.graph_options.chart.width = window.innerWidth * 0.89
                    if (this.options.graph_type.includes('heatmap')) {
                        let count = this.heatmap_data.categories.symptoms.length + this.heatmap_data.categories.medicines.length
                        this.graph_options.chart.height = count * 20 + 80

                        if (this.options.graph.categories.includes('symptom')) {
                            this.graph_options.yAxis[0].height = 20 * this.heatmap_data.categories.symptoms.length

                            if (this.graph_options.yAxis[1]) {
                                this.graph_options.yAxis[1].top = 20 * this.heatmap_data.categories.symptoms.length + 30
                                this.graph_options.yAxis[1].height = 20 * this.heatmap_data.categories.medicines.length
                            }

                            if (!this.heatmap_data.show_medicines || !this.heatmap_data.categories.medicines.length) {
                                let count = this.heatmap_data.categories.medicines.length
                                this.graph_options.chart.height -= count * 20
                            }
                        }
                    } else {
                        this.graph_options.chart.height = Math.max(window.innerHeight - 230, 500)
                        if (this.mobile && this.graph_options.series.length > 2) {
                            this.graph_options.chart.height += 50 * (this.graph_options.series.length - 2)
                        }
                    }
                }
            }
        );

        Event.listen('back-to-dashboard', () => {
            this.options.loaded = false;
            this.options.collapse_points = undefined
            window.OBJECT_ID = undefined;
        });

        Event.listen('graph-update-dates', (dates) => {
            this.options.dates = dates
            this.load()
        });

        Event.listen('update-points', (mode) => {
            this.load()
            this.options.collapse_points = mode
            this.$forceUpdate()
        });

        Event.listen('update-legend', (mode) => {
            this.options.show_legend = mode
            if (this.graph_options)
                this.graph_options.legend.enabled = mode
        });

        Event.listen('update-medicines', (mode) => {
            this.heatmap_data.show_medicines = mode
            this.load()
            this.$forceUpdate()
        });

        Event.listen('incorrect-dates', (duration) => {
            if (duration < 0 && this.errors[0] != '<strong>Выбран некорректный период</strong>')
                this.errors.unshift('<strong>Выбран некорректный период</strong>')
            else if (duration > 30 && this.errors[0] != 'Пожалуйста, выберите период <strong>не больше</strong> 30 дней.')
                this.errors.unshift('Пожалуйста, выберите период <strong>не больше</strong> 30 дней.')
        })

        Event.listen('generate-report', () => {
            if (this.options.loaded)
                this.generate_report()
        })
    }
}
</script>

<style scoped>
.table {
    table-layout: fixed;
    width: 100%;
    text-align: center;
    font-size: 0.8rem;
}


table tr {
    break-inside: avoid;
}
</style>
