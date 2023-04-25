<template>
    <div v-if="data">
        <div v-if="!data.length" class="content-container">
            <p style="text-align: center"><img :src="images.nothing_found"/></p>

            <p style="text-align: center">
                <small>Ничего не найдено.</small>
            </p>
        </div>
        <div v-else>
            <div v-for="(info, date) in dates">
                <table class="table table-hover fixed-columns">
                    <colgroup>
                        <col span="1" style="width: 25%;">
                        <col span="1" style="width: 75%;">
                    </colgroup>

                    <tr class="table-info">
                        <th colspan="2">{{ date }}</th>
                    </tr>

                    <tr v-for="record in info.records">
                        <th>
                            {{ record.category_info.description }}<br>
                            <small class="text-muted">{{record.formatted_time}}, {{ record.formatted_date }}</small>
                        </th>
                        <td>
                            <span
                                v-if="!(record.attached_files && record.attached_files[0] && record.value == record.attached_files[0].name)">{{
                                    record.value
                                }}</span>
                            <span v-if="record.category_info.unit"> ({{ record.category_info.unit }})</span>

                            <!-- Лекарства -->
                            <span
                                v-if="record.category_info.name == 'medicine' && record.params && record.params.dose"> ({{
                                    record.params.dose
                                }})</span>

                            <!-- Файлы -->
                            <div class="row" v-for="file in record.attached_files">
                                <img :src="images.file" height="20" style="margin-right: 5px"/>
                                <a href="#" @click="get_file(file, 'download')">{{ file.name }} (скачать)</a>
                                <more-info-block title="Просмотр" :id="`file_${i}_${record.id}_${file.id}`"
                                                 v-if="file.type.includes('image')" class="col-12">
                                    <loading v-if="!files_to_show[file.id]"/>
                                    <img :src="`data:${file.type};base64,${files_to_show[file.id].base64}`"
                                         :style="`max-width: ${img_width}px; max-height: ${img_height}px;`" v-else/>
                                </more-info-block>
                            </div>

                            <!-- Комментарии -->
                            <div v-if="record.params && record.params.comment">
                                <strong>Комментарий: </strong> {{ record.params.comment }}
                            </div>
                            <more-info-block title="Комментарии агентов" :id="'additions' + record.id"
                                             v-if="record.additions">
                                <ul>
                                    <li v-for="addition in record.additions" class="text-muted"
                                        style="font-size: small">
                                        <span v-html="addition.addition.comment"/>{{ addition }}
                                    </li>
                                </ul>
                            </more-info-block>

                            <!-- Интегральная оценка -->
                            <more-info-block title="Результаты по группам" :id="'group_results' + record.id"
                                             v-if="record.params && record.params.group_scores  && !to_export">
                                <ul>
                                    <li v-for="(score, group) in record.params.group_scores" class="text-muted"
                                        style="font-size: small">
                                        <strong>{{ group }}:</strong> {{ score }}
                                    </li>
                                </ul>
                            </more-info-block>

                            <!-- Карта -->
                            <more-info-block title="Показать зоны на карте" :id="'map' + record.id"
                                             v-if="record.params && record.params.map && !to_export">
                                <interactive-map :map="record.params.map" :parts="record.params.answer" :id="record.id"/>
                            </more-info-block>

                            <!-- Настройки алгоритма -->
                            <more-info-block title="Настройки алгоритма" :id="'algorithm_params' + record.id"
                                             v-if="record.params && record.params.object_type == 'algorithm' &&
                                     record.params.algorithm_params  && record.params.algorithm_params.length && !to_export">
                                <ul>
                                    <li v-for="param in record.params.algorithm_params" class="text-muted"
                                        style="font-size: small">
                                        <strong>{{ param.name }}:</strong> {{ param.value }}
                                    </li>
                                </ul>
                            </more-info-block>

                            <!-- Технические параметры -->
                            <more-info-block title="Технические параметры" :id="'params' + record.id"
                                             v-if="record.params && !to_export">
                                <span class="text-muted" style="font-size: small">{{ record.params }}</span>
                            </more-info-block>

                            <div class="text-muted" v-if="record.params && record.params.group_scores && to_export">
                                <h6>Результаты по группам:</h6>
                                <ul>
                                    <li v-for="(score, group) in record.params.group_scores" class="text-muted"
                                        style="font-size: small">
                                        <strong>{{ group }}:</strong> {{ score }}
                                    </li>
                                </ul>
                            </div>

                            <div class="text-muted" v-if="to_export && record.additions">
                                <h6>Комментарии агентов:</h6>
                                <ul>
                                    <li v-for="addition in record.additions" class="text-muted"
                                        style="font-size: small">
                                        <span v-html="addition.addition.comment"/></li>
                                </ul>
                            </div>

                            <div v-if="to_export && record.params && record.params.map">
                                <interactive-map :map="record.params.map" :parts="record.params.answer" :id="record.id"/>
                            </div>
                        </td>
                    </tr>

                    <tr v-if="info.symptoms && info.symptoms.length">
                        <th>
                            Симптомы<br>
                            <small class="text-muted">{{ date }}</small></th>
                        <td>
                            <ul>
                                <li v-for="symptom in info.symptoms">{{ symptom.value }}</li>
                            </ul>
                        </td>
                    </tr>
                </table>
            </div>

        </div>
    </div>
</template>

<script>
import MoreInfoBlock from "./MoreInfoBlock";
import downloadjs from "downloadjs";
import Loading from "./Loading";
import InteractiveMap from "./InteractiveMap";

export default {
    name: "RecordsList",
    components: {InteractiveMap, Loading, MoreInfoBlock},
    props: ['data', 'to_export'],
    data() {
        return {
            files_to_show: {}
        }
    },
    computed: {
        img_width() {
            return Math.floor(window.innerWidth * 0.6)
        },
        img_height() {
            return Math.floor(window.innerHeight * 0.6)
        },
        dates() {
            let records_by_dates = this.group_by(this.data, 'formatted_date')
            let dates = {}
            Object.entries(records_by_dates).forEach((date) => {
                dates[date[0]] = {
                    records: date[1].filter(record => record.category_info.name != 'symptom'),
                    symptoms: date[1].filter(record => record.category_info.name == 'symptom')
                }
            })
            return dates
        }
    },
    methods: {
        get_file: function (file, action) {
            this.axios.post(this.url('/api/settings/get_file'), file).then(response => {
                if (action == 'download')
                    downloadjs(`data:${file.type};base64,${response.data.base64}`, file.name, file.type);
                else if (action == 'show')
                    this.files_to_show[file.id] = response.data
                this.$forceUpdate()
            }).catch(() => Event.fire('load-error'));
        }
    },
    mounted() {
        Event.listen('open-more-info', (id) => {
            if (id.includes('file')) {
                let ids = id.split('_').filter(p => p != 'file').map(p => parseInt(p))
                if (!this.files_to_show[ids[2]]) {
                    let file = this.data[ids[0]].records.find(r => r.id == ids[1]).attached_files.find(f => f.id == ids[2])
                    this.get_file(file, 'show')
                }
            }
        })
    }
}
</script>

<style scoped>
h1, h2 {
    font-weight: normal;
}

body {
    background-color: #f8f8fb;
}

table tr {
    break-inside: avoid;
}

img {
    object-fit: contain;
    object-position: left top;
}
</style>