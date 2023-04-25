<template>
    <div>
        <div v-if="!mobile" style="margin: 0 5px">
            <div class="row">
                <!-- Период -->
                <div class="col">
                    <select class="form-control form-control-sm" style="height: 33px"
                            v-model="dates.period" @change="select_period()">
                        <option :value="30" :disabled="!dates.range[1]">Месяц</option>
                        <option :value="14" :disabled="!dates.range[1]">Две недели</option>
                        <option :value="7" :disabled="!dates.range[1]">Неделя</option>
                        <option :value="3" :disabled="!dates.range[1]">Три дня</option>
                        <option :value="1" :disabled="!dates.range[1]">День</option>
                        <option :value="-1" v-if="!page.includes('heatmap')">Все данные</option>
                        <option :value="undefined" disabled>Период не выбран</option>
                    </select>
                </div>
                <!-- Даты -->
                <div>
                    <button class="btn btn-default btn-sm" style="margin-top: -2px"
                            @click="scroll_dates(true)" :disabled="dates.range.some(d => !d)">
                        &#8592;
                    </button>

                    <date-picker :class="`${page}${page == 'report' && window_mode == 'settings' ? '-settings' : ''}`"
                                 format="c DD.MM.YYYY" v-model="dates.range[0]" @change="select_dates(0)"/>
                    <date-picker :class="`${page}${page == 'report' && window_mode == 'settings' ? '-settings' : ''}`"
                                 format="по DD.MM.YYYY" v-model="dates.range[1]" @change="select_dates(1)"/>

                    <button class="btn btn-default btn-sm" style="margin-top: -2px"
                            @click="scroll_dates(false)" :disabled="dates.range.some(d => !d)">
                        &#8594;
                    </button>
                </div>

                <!-- PDF -->
                <button class="btn btn-sm btn-default" :disabled="disable_downloading"
                        @click="generate_report()">Скачать PDF
                </button>

                <!-- Настройки графика -->
                <div class="col-3" v-if="page.includes('graph')">
                    <input type="checkbox" id="hide_legend" v-model="legend_mode"
                           @change="change_mode('legend', !legend_mode)"/>
                    <label for="hide_legend">Скрыть легенду</label>
                    <input type="checkbox" id="collapse_points" v-model="points_mode"
                           @change="change_mode('points', points_mode)"
                           v-if="show_collapse"/>
                    <label for="collapse_points" v-if="show_collapse">Усреднить</label>
                </div>

                <!-- Тепловая карта -->
                <div v-if="page == 'symptoms-heatmap'" style="padding-top: 5px;">
                    <input type="checkbox" id="show_medicines" @change="change_mode('medicines', medicines_mode)"
                           v-model="medicines_mode"/>
                    <label for="show_medicines">Показать лекарства</label>
                </div>
            </div>

            <!-- Категории -->
            <div class="row" v-if="page == 'report' && categories">
                <div class="col">
                    <multiselect v-model="selected_categories" :options="category_groups" :multiple="true"
                                 :close-on-select="false" :clear-on-select="false" :preserve-search="true"
                                 group-values="categories" group-label="group" :group-select="true"
                                 label="description" track-by="description"
                                 placeholder="Введите название категории..."
                                 select-label="Выбрать" selected-label="Выбрано" select-group-label="Выбрать всю группу"
                                 deselect-group-label="Убрать всю группу" deselect-label="Убрать"
                                 @input="update_categories"></multiselect>
                </div>
            </div>
        </div>

        <!-- Мобильная версия -->
        <div v-else>
            <div class="row" :style="`margin-left: ${window_mode != 'settings' ? -5 : 0}px`">
                <button class="btn btn-sm btn-danger" @click="go_back()" v-if="!object_id && window_mode == 'settings'">
                    Назад
                </button>
                <!-- Период -->
                <div class="col">
                    <select class="form-control form-control-sm" v-model="dates.period" @change="select_period()">
                        <option :value="30" :disabled="!dates.range[1]">Месяц</option>
                        <option :value="14" :disabled="!dates.range[1]">Две недели</option>
                        <option :value="7" :disabled="!dates.range[1]">Неделя</option>
                        <option :value="3" :disabled="!dates.range[1]">Три дня</option>
                        <option :value="1" :disabled="!dates.range[1]">День</option>
                        <option :value="-1">Все данные</option>
                        <option :value="undefined" disabled>Период не выбран</option>
                    </select>
                </div>
            </div>

            <!-- Даты -->
            <div class="row" style="margin: 0">
                <button class="btn btn-default btn-sm" @click="scroll_dates(true)"
                        :disabled="dates.range.some(d => !d)">
                    &#8592;
                </button>

                <date-picker class="col" format="c DD.MM.YYYY" placeholder="Выбрать начало периода"
                             v-model="dates.range[0]"
                             @change="select_dates(0)"/>
                <date-picker class="col" format="по DD.MM.YYYY" placeholder="Выбрать конец периода"
                             v-model="dates.range[1]"
                             @change="select_dates(1)"/>

                <button class="btn btn-default btn-sm" @click="scroll_dates(false)"
                        :disabled="dates.range.some(d => !d)">
                    &#8594;
                </button>
            </div>

            <div class="row" style="margin-left: -5px; margin-right: -5px; margin-top: 5px; margin-bottom: 5px;">
                <!-- Категории -->
                <div class="col" v-if="page == 'report' && categories">
                    <multiselect v-model="selected_categories" :options="category_groups" :multiple="true"
                                 :close-on-select="false" :clear-on-select="false" :preserve-search="true"
                                 group-values="categories" group-label="group" :group-select="true"
                                 label="description" track-by="description"
                                 placeholder="Введите название категории..."
                                 select-label="Выбрать" selected-label="Выбрано" select-group-label="Выбрать всю группу"
                                 deselect-group-label="Убрать всю группу" deselect-label="Убрать"
                                 @input="update_categories"></multiselect>
                </div>

                <div style="padding-top: 5px; margin-left: 10px" v-else>
                    <!-- Настройки графика -->
                    <div v-if="page.includes('graph')">
                        <input type="checkbox" id="hide_legend_mobile" v-model="legend_mode"
                               @change="change_mode('legend', !legend_mode)"/>
                        <label for="hide_legend_mobile">Скрыть легенду</label>
                        <input type="checkbox" id="collapse_points_mobile" v-model="points_mode"
                               @change="change_mode('points', points_mode)"/>
                        <label for="collapse_points_mobile">Усреднить значения</label>
                    </div>

                    <!-- Тепловая карта -->
                    <div v-if="page == 'symptoms-heatmap'">
                        <input type="checkbox" id="show_medicines_mobile"
                               @change="change_mode('medicines', medicines_mode)"
                               v-model="medicines_mode"/>
                        <label for="show_medicines_mobile">Показать лекарства</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import * as moment from "moment/moment";
import DatePicker from 'vue2-datepicker';
import Multiselect from 'vue-multiselect'
import 'vue2-datepicker/index.css';
import 'vue2-datepicker/locale/ru';

export default {
    name: "FilterPanel",
    props: ['data', 'categories', 'page', 'disable_downloading', 'patient', 'last_date'],
    components: {DatePicker, Multiselect},
    data() {
        return {
            dates: undefined,
            category: undefined,
            selected_categories: [],
            legend_mode: false,
            points_mode: true,
            medicines_mode: false,
            show_collapse: false
        }
    },
    computed: {
        category_groups() {
            let groups = []
            Object.entries(this.group_by(this.categories, 'subcategory')).forEach(([group, categories]) => {
                groups.push({
                    group: group,
                    categories: categories
                })
            })
            return groups
        }
    },
    methods: {
        generate_report: function () {
            Event.fire('generate-report')
        },
        update_dates: function () {
            let action = (this.page == 'report' ? this.page : 'graph') + '-update-dates'
            this.dates.range = [
                this.dates.range[0] ? this.start_of_day(this.dates.range[0]) : undefined,
                this.dates.range[1] ? this.end_of_day(this.dates.range[1]) : undefined
            ]
            Event.fire(action, this.dates.range)
        },
        update_categories: function (value) {
            Event.fire('update-categories', this.selected_categories)
        },
        change_mode: function (target, mode) {
            Event.fire('update-' + target, mode)
        },
        scroll_dates: function (back) {
            let duration = this.dates_difference(this.dates.range[0], this.dates.range[1])
            if (this.page.includes('heatmap') && duration > 30) return

            if (this.dates.range[0] <= this.dates.range[1]) {
                this.dates.range[0] = this.add_days(this.dates.range[0], (back ? -1 : 1) * duration)
                this.dates.range[1] = this.add_days(this.dates.range[1], (back ? -1 : 1) * duration)
            }

            this.$forceUpdate()
            this.update_dates()
        },
        select_dates: function (index) {
            this.dates.range[index] = index ?
                this.end_of_day(this.dates.range[index]) :
                this.start_of_day(this.dates.range[index])
            if (!this.dates.range.some(d => d == undefined)) {
                let duration = this.dates_difference(this.dates.range[0], this.dates.range[1])
                this.dates.period = [30, 14, 7, 3, 1].includes(duration) ? duration : undefined

                if (duration < 0 || this.page.includes('heatmap') && duration > 30) {
                    Event.fire('incorrect-dates', duration)
                    return
                }
            }

            this.$forceUpdate()
            this.update_dates()
        },
        select_period: function () {
            if (this.dates.period > 0) {
                this.dates.range[0] = this.start_of_day(this.add_days(this.dates.range[1], -this.dates.period + 1))
            } else {
                this.dates.range = [undefined, this.end_of_day(new Date())]
            }
            this.update_dates()
        },
    },
    created() {
        this.dates = {
            range: [],
            period: undefined,
        }

        Event.listen('load-report', params => {
            this.dates.range = [undefined, this.last_date]
            this.dates.period = -1
        })

        Event.listen('load-day-graph', params => {
            this.dates.range = [undefined, this.last_date]
            this.dates.period = -1
        })

        Event.listen('back-to-dashboard', () => {
            this.legend_mode = false
            this.points_mode = false
            this.medicines_mode = false
        });

        Event.listen('show-collapse', mode => {
            this.show_collapse = mode
            this.$forceUpdate()
        })

        Event.listen('set-collapse-mode', collapsed => {
            this.points_mode = collapsed
            this.$forceUpdate()
        })

        Event.listen('set-dates', dates => {
            this.dates.range = [
                dates[0] ? this.start_of_day(dates[0]) : undefined,
                dates[1] ? this.end_of_day(dates[1]) : undefined
            ]

            let duration = this.dates_difference(this.dates.range[0], this.dates.range[1])
            this.dates.period = [30, 14, 7, 3, 1].includes(duration) ? duration : undefined

            this.$forceUpdate()
        })
    }

}
</script>

<style src="vue-multiselect/dist/vue-multiselect.min.css"></style>
<style>
.row {
    margin-bottom: 5px;
    grid-column-gap: 5px;
}

.multiselect__tag {
    white-space: unset;
    margin-bottom: 0;
}

.multiselect__option {
    white-space: unset;
}

/*.graph .mx-icon-clear, .graph .mx-icon-calendar,*/
/*.report-settings .mx-icon-clear, .report-settings .mx-icon-calendar {*/
/*    top: 25%;*/
/*    right: 25px;*/
/*}*/

</style>

<style scoped>
.btn {
    height: 32px;
}
</style>