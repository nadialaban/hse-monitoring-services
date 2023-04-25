<template>
  <div v-if="patient">
    <vue-confirm-dialog/>
    <h3>Заключение</h3>

    <!-- заполнение -->
    <card title="Формирование" v-if="state == 'forming'">
      <div v-for="(q, i) in questions">
        <form-group48 :title="q.text"
                      :big="true"
                      :required="true"
                      style="margin-top: 15px; margin-bottom: 15px;">

          <div v-if="q.type == 'variants' && q.variants.length">
            <div class="form-check" v-for="(variant, j) in q.variants">
              <input class="form-check-input monitoring-input" type="radio"
                     :id="'radio_' + i + '_' + j" :name="'radio_' + i"
                     v-model="result_parts[q.index]" :value="variant">
              <label class="form-check-label" :for="'radio_' + i + '_' + j">{{ variant }}</label>
            </div>
          </div>


          <div v-if="q.type == 'multiple-choice' && q.variants.length">
            <div class="form-check" v-for="(variant, j) in q.variants">
              <input class="form-check-input monitoring-input" type="checkbox"
                     :id="'checkbox_' + i + '_' + j" :name="'checkbox_' + i + '_' + j"
                     @change="multiple_choice(q, variant)" v-model="q.selected.includes(variant)"
                     style="margin-left: -20px">
              <label class="form-check-label" :for="'checkbox_' + i + '_' + j">{{ variant }}</label>
            </div>
          </div>

          <div v-if="q.type == 'text'">
            <input type="text" class="form-control monitoring-input" v-model="result_parts[q.index]"/>
          </div>
          <div v-if="q.type == 'textarea'">
            <textarea class="form-control monitoring-input" rows="5" v-model="result_parts[q.index]"/>
          </div>
        </form-group48>
      </div>
    </card>

    <!-- редактирование -->
    <card title="Редактирование" v-if="state == 'editing'">
      <textarea class="form-control monitoring-input"
                rows="20" v-model="conclusion"/>
    </card>

    <!-- кнопки -->
    <button class="btn btn-default" @click="generate()"
            v-if="state == 'forming'">Сформировать
    </button>
    <div class="row" style="margin-left: 1px; grid-column-gap: 10px;">
      <button class="btn btn-danger" @click="go_back()"
              v-if="state == 'editing' && questions.length">Назад
      </button>
      <button class="btn btn-default" @click="send()"
              v-if="state == 'editing'">Отправить
      </button>
    </div>
  </div>
</template>

<script>
import Card from "./parts/Card";
import JSSoup from 'jssoup';
import FormGroup48 from "./parts/FormGroup-4-8";

export default {
  name: "ConclusionEditor",
  components: {FormGroup48, Card},
  props: {
    patient: {
      required: true
    }
  },
  data() {
    return {
      state: 'forming',
      conclusion_template: undefined,
      conclusion: undefined,
      soup: undefined,
      questions: [],
      result_parts: []
    }
  },
  created() {
    if (this.window_mode != 'conclusion') return
    this.conclusion_template = this.patient.scenario.conclusion_template
    this.soup = new JSSoup(this.conclusion_template)

    this.soup.contents.forEach((el, index) => {
      if (el.name == 'variants') {
        let q = {
          type: 'variants',
          text: el.attrs.q,
          variants: el.contents.map(v => v.getText()),
          index: index
        }
        this.questions.push(q)
        this.result_parts.push(q.variants[0])
      } else if (['text', 'textarea'].includes(el.name)) {
        let q = {
          type: el.name,
          text: el.attrs.q,
          default: el.contents,
          index: index
        }
        this.questions.push(q)
        this.result_parts.push(q.default)
      } else if (el.name == 'medicines') {
        let meds = window.PARAMS.medicines.concat(window.PARAMS.canceled_medicines.map(m => m + ' (отменено)'))
        this.result_parts.push('\n- ' + meds.join('\n- '))
      } else if (el.name == 'medicines-select') {
        let meds = window.PARAMS.medicines.concat(window.PARAMS.canceled_medicines)
        let q = {
          type: 'multiple-choice',
          text: el.attrs.q,
          variants: meds,
          selected: [],
          index: index
        }
        this.questions.push(q)
        this.result_parts.push('-')
      } else {
        this.result_parts.push(el._text)
      }
    })

    this.state = this.questions.length ? 'forming' : 'editing'
    this.conclusion = this.result_parts.join('')
    console.log('result parts', this.result_parts)
    console.log('questions', this.questions)
  },
  methods: {
    multiple_choice: function (q, choice) {
      if (q.selected.includes(choice))
        q.selected = q.selected.filter(v => v != choice)
      else
        q.selected.push(choice)

      this.result_parts[q.index] = q.selected.length ? '\n- ' + q.selected.join('\n- ') : '-'
    },
    generate: function () {
      this.conclusion = this.result_parts.join('')
      this.state = 'editing'
    },
    send: function () {
      this.$confirm(
          {
            message: `Отправить заключение?`,
            button: {
              no: 'Нет',
              yes: 'Да'
            },
            callback: confirm => {
              if (confirm) {
                this.axios.post(this.url('/send-conclusion'), {conclusion: this.conclusion}).then(Event.fire('action-done'));
              }
            }
          }
      )

    },
    go_back: function () {
      this.state = 'forming'
    }
  }
}
</script>

<style scoped>

</style>