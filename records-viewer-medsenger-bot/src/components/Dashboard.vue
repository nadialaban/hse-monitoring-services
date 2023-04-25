<template>
    <div v-if="patient && categories && !object_id">
        <div v-if="window_mode != 'graph'">
            <h5>Отчеты</h5>
            <div class="row">
                <div v-for="(report, i) in report_categories" :key="'report_' + i"
                     class="col-lg-2 col-md-3">
                    <card :image="images.report" :title="report.title">
                        <a @click="load_report(report)" href="#" class="btn btn-default">Открыть</a>
                    </card>
                </div>
            </div>
        </div>

        <div v-if="plottable_categories.length">
            <h5>Графики</h5>
            <div class="row">
                <div v-for="(category, i) in plottable_categories" :key="'graph_' + i"
                     class="col-lg-2 col-md-3">
                    <card :image="images.graph" :title="category.title">
                        <a @click="load_graph(category, 'line-graph')" href="#" class="btn btn-default">Открыть</a>
                    </card>
                </div>
            </div>
        </div>

        <div v-if="plottable_day_graphs.length">
            <h5>Графики по суткам</h5>
            <div class="row">
                <div v-for="(category, i) in plottable_day_graphs" :key="'day_graph_' + i"
                     class="col-lg-2 col-md-3">
                    <card :image="images.graph" :title="category.title">
                        <a @click="load_graph(category, 'day-graph')" href="#" class="btn btn-default">Открыть</a>
                    </card>
                </div>
            </div>
        </div>

        <div v-if="plottable_heatmap_categories.length">
            <h5>Тепловые карты</h5>
            <div class="row">
                <div v-for="(category, i) in plottable_heatmap_categories" :key="'heatmap_' + i"
                     class="col-lg-2 col-md-3">
                    <card :image="images.heatmap" :title="category.title">
                        <a @click="load_graph(category, 'heatmap')" href="#" class="btn btn-default">Открыть</a>
                    </card>

                </div>
            </div>
        </div>

        <div style="margin-top: 15px;" class="alert alert-info" role="alert">
            <p>В этом разделе можно посмотреть внесенные данные разных представлениях:</p>
            <ul>
                <li v-if="window_mode == 'settings'"><strong>В виде отчета</strong>. Таблица записей фильтруются по
                    датам и категориям. Отчет доступен для скачивания в формате PDF.
                </li>
                <li><strong>В виде графиков.</strong> Числовые данные отображаются в виде кривых, а текстовые (симптомы,
                    лекарства и комментарии) на линии в нижней части графика. Чтобы посмотреть подробную информацию,
                    наведите мышку на нужную точку графика.
                </li>
                <li><strong>В виде суточных графиков.</strong> Числовые данные отображаются в виде точек, разбросанных в
                    пределах одних суток.
                </li>
                <li><strong>В виде тепловых карт.</strong> Симптомы и приемы лекарств отображаются с частотой появления
                    за день. Чтобы посмотреть подробную информацию, наведите мышку на нужную ячейку карты.
                </li>
            </ul>
        </div>

    </div>
</template>

<script>
import Card from "./parts/Card";
import * as moment from "moment/moment";
import report from "./Report";

export default {
    name: "Dashboard",
    components: {Card},
    props: {
        patient: {
            required: true
        }
    },
    data() {
        return {
            categories: undefined,
            groups: undefined,
        }
    },
    computed: {
        plottable_categories: function () {
            let plottable = this.categories.filter((category) => {
                return !category.is_legacy && ['scatter', 'values', 'day_sum'].includes(category.default_representation) &&
                    !['string', 'file'].includes(category.type)
            })

            // вытаскиваем группы
            let custom = this.groups.filter((group) => group.type == 'line-graph')

            // вытаскиваем категории, которые не вошли в группы
            let not_custom = plottable.filter((category) =>
                !custom.some((group) => group.categories.includes(category.name)))

            not_custom.forEach((category) => {
                custom.push({
                    title: category.description,
                    categories: [category.name]
                })
            })

            if (this.source == 'patient') custom = custom.filter(c => !c.only_doctor)

            return custom
        },
        plottable_heatmap_categories: function () {
            let heatmaps = this.groups.filter((group) => group.type == 'heatmap')
            if (this.source == 'patient') heatmaps = heatmaps.filter(c => !c.only_doctor)

            return heatmaps
        },
        plottable_day_graphs: function () {
            return this.groups.filter((group) => group.type == 'day-graph')
        },
        report_categories: function () {
            let reports = this.groups.filter((group) => group.type == 'report')
            reports = reports.map(report => {
                if (!report.categories.length) {
                    report.categories = this.categories.map(c => c.name).filter(c => c != 'doctor_action')
                    if (this.source == 'patient')
                        report.categories = report.categories.filter(c => c != 'action')
                    report.filters = this.categories.filter(c => report.categories.includes(c.name))
                }
                return report
            })

            if (this.source == 'patient') reports = reports.filter(c => !c.only_doctor)

            return reports
        }
    },
    methods: {
        load_report: function (params) {
            Event.fire('load-report', params)
        },
        load_graph: function (params, type) {
            Event.fire('load-' + type, params)
        },
    },
    mounted() {
        this.axios.get(this.url('/api/categories')).then(response => {
            this.categories = response.data.categories
            this.categories.sort((a, b) => a.id - b.id)
            this.groups = response.data.groups
            this.groups.sort((a, b) => a.id - b.id)

            if (window.OBJECT_ID) {
                if (this.window_mode == 'graph-presenter') {
                    if (window.OBJECT_ID == -1) {
                        this.load_report(this.report_categories.filter(report => report.id == 1)[0]);
                    } else {
                        let category = this.categories.filter(c => c.id == window.OBJECT_ID)
                        if (category.length) {
                            let params = {
                                title: category[0].description,
                                categories: [category[0].name]
                            }
                            this.load_graph(params, 'line-graph')
                        }
                    }
                } else if (['group-presenter', 'log'].includes(this.window_mode)) {
                    let group = this.groups.filter(g => g.id == this.object_id)
                    if (group.length) {
                        if (group[0].type == 'report') {
                            this.load_report(this.report_categories.filter(report => report.id == this.object_id)[0]);
                        } else {
                            this.load_graph(group[0], group[0].type)
                        }
                    }
                }
            }

        });
    }
}
</script>

<style scoped>

</style>