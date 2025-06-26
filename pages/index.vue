<template>
  <div class="chat-container">
    <div class="messages" ref="messagesContainer" @scroll="handleScroll">
      <div v-if="messages.length === 0" class="welcome-message">มีอะไรให้ฉันช่วยหรือ</div>
      <div v-for="(msg, index) in messages" :key="index" class="message-row" :class="msg.role">
        <div class="message message-with-copy" :class="{ 'with-copy': msg.role === 'bot' && msg.text !== 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ' }">
          <div class="copy-button-wrapper" v-if="msg.role === 'bot' && msg.text !== 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ'">
            <span class="copy-btn-inside" @click="copyToClipboard(msg.text, index, $event)" title="คัดลอกข้อความ" tabindex="0" role="button">
              {{ copiedIndex === index ? 'คัดลอกแล้ว' : 'คัดลอก' }}
            </span>
          </div>
          <div class="message-text" style="white-space: pre-line;" v-html="msg.text"></div>
        </div>
        <div class="timestamp" :title="formatFullDate(msg.timestamp)">
          {{ formatRelativeTime(msg.timestamp) }}
        </div>
      </div>

      <div v-if="loading && !typingMessage" class="thinking-message">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span> กำลังคิดคำตอบ...
      </div>
      <div v-if="typingMessage" class="message-row bot">
        <div class="message-wrapper">
          <div class="message">
            <div style="white-space: pre-line;" v-html="typingMessage"></div>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <button v-if="showScrollToBottom" class="scroll-to-bottom-btn" @click="scrollToBottom" aria-label="เลื่อนไปแชทล่าสุด">🡻</button>
    </transition>

    <div class="program-select-area">
      <label for="program-select" style="margin-right: 0.5rem;">เลือกโปรแกรม (ไม่บังคับ):</label>
      <select
        id="program-select"
        v-model="selectedProgram"
        ref="programSelect"
        :style="{ width: selectWidth + 'px' }"
        @change="updateSelectWidth"
      >
        <option value="">-- ไม่เลือก --</option>
        <option v-for="name in programNames" :key="name" :value="name">{{ name }}</option>
      </select>
      <span ref="widthMeasurer" class="select-width-measurer">{{ selectedProgram || '-- ไม่เลือก --' }}</span>
    </div>
    <!-- เพิ่ม select สำหรับประเภทที่ต้องการค้นหา -->
    <div class="type-select-area">
      <label for="type-select" style="margin-right: 0.5rem;">เลือกประเภทที่ต้องการค้นหา (ไม่บังคับ):</label>
      <select
        id="type-select"
        v-model="selectedType"
        ref="typeSelect"
        :style="{ width: typeSelectWidth + 'px' }"
        @change="updateTypeSelectWidth"
      >
        <option value="">-- ไม่เลือก --</option>
        <option value="ปัญหา">ปัญหา</option>
        <option value="รายละเอียด">รายละเอียด</option>
      </select>
      <span ref="typeWidthMeasurer" class="select-width-measurer">{{ selectedType || '-- ไม่เลือก --' }}</span>
    </div>
    <div class="input-area">
      <textarea
        v-model="input"
        placeholder="พิมพ์ปัญหา..."
        @keyup.enter.exact="sendMessage"
        @input="autoResize"
        rows="1"
        ref="inputBox"
        style="resize: none; width: 100%; min-height: 44px; max-height: 132px;"
      ></textarea>
      <button @click="sendMessage" aria-label="ส่งข้อความ" :disabled="loading || typingMessage">➤</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      input: '',
      messages: [],
      loading: false,
      typingMessage: null,
      showScrollToBottom: false,
      copiedIndex: null,
      selectedProgram: '',
      selectWidth: 0,
      programNames: [
        'Easy Account', 'Easy Sale', 'Easy Service', 'Easy Loan', 'Easy Crm',
        'Easy Hr', 'Check Time', 'Posonal Loan', 'Cash Control', 'HBG-MAN',
        'API-SALE', 'E-garage', 'Pre vhc', 'Mirai', 'E-Tax', 'Shopping Loan',
        'Hornbill Group', 'ข้อมูลลูกค้ากลาง', 'Easy_sale [BYD]', 'Dealer Pro',
        'Posonal Loan(pico)', 'E-Tax(mirai)', 'LINE_API', 'Insurance',
        'โปรแกรมป้ายแดง', 'โปรแกรมป้ายแดง  BYD', 'รายงาน Data Pool'
      ],
      generateTableFromObject: null, // ย้ายมาไว้ใน data
      typingInterval: null, // เพิ่มตัวแปรนี้
      selectedType: '', // เพิ่มตัวแปรนี้
      typeSelectWidth: 0, // เพิ่มตัวแปรนี้
    }
  },
  mounted() {
    this.$nextTick(this.updateSelectWidth)
    this.$nextTick(this.updateTypeSelectWidth)
  },
  watch: {
    selectedProgram() {
      this.$nextTick(this.updateSelectWidth)
    },
    selectedType() {
      this.$nextTick(this.updateTypeSelectWidth)
    }
  },
  methods: {
    async sendMessage() {
      if (this.loading || this.typingMessage || !this.input.trim()) return

      const userMessage = this.input
      this.messages.push({ role: 'user', text: userMessage, timestamp: new Date() })
      this.input = ''
      this.$nextTick(() => this.autoResize())
      this.$nextTick(this.scrollToBottom)

      this.loading = true
      try {
        const payload = { message: userMessage }
        if (this.selectedProgram) payload.program_name = this.selectedProgram
        if (this.selectedType) payload.type = this.selectedType // เพิ่ม type เข้า payload ถ้ามีเลือก 

        const res = await fetch('http://localhost:5678/webhook/ai_search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          let errorText = await res.text()
          this.messages.push({
            role: 'bot',
            text: `เกิดข้อผิดพลาดจาก API: ${res.status} ${res.statusText}<br><pre>${errorText}</pre>`,
            timestamp: new Date(),
          })
          this.loading = false
          this.$nextTick(this.scrollToBottom)
          return
        }

        let data
        try {
          data = await res.json()
        } catch (jsonErr) {
          // ลองอ่านเป็น text แล้ว log ให้ dev ดู
          const text = await res.text()
          console.error('Response is not JSON:', text)
          this.messages.push({
            role: 'bot',
            text: 'ข้อมูลที่ได้รับไม่ถูกต้อง (ไม่ใช่ JSON)<br><pre>' + text + '</pre>',
            timestamp: new Date(),
          })
          this.loading = false
          this.$nextTick(this.scrollToBottom)
          return
        }

        await this.handleOutput(data)
        this.$nextTick(this.scrollToBottom)
      } catch (err) {
        this.messages.push({
          role: 'bot',
          text: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ<br><pre>' + (err?.message || err) + '</pre>',
          timestamp: new Date(),
        })
        this.loading = false
        this.$nextTick(this.scrollToBottom)
      }
    },

    async handleOutput(output) {
      if (Array.isArray(output)) {
        if (output.length && typeof output[0] === 'object') {
          if (output.length === 1) {
            // แสดงแบบไม่มี "รายการที่"
            const tableHtml = this.generateTableFromObject(output[0])
            await this.typeBotMessage(tableHtml)
          } else {
            const total = output.length
            for (const [i, item] of output.entries()) {
              const tableHtml = this.generateTableFromObject(item)
              await this.typeBotMessage(`<strong>รายการที่ ${i + 1} จาก ${total} รายการ</strong><br>` + tableHtml)
            }
          }
        } else {
          for (const item of output) {
            await this.handleOutput(item)
          }
        }
      } else if (typeof output === 'object' && output !== null) {
        const tableHtml = this.generateTableFromObject(output)
        await this.typeBotMessage(tableHtml)
      } else if (typeof output === 'string' && output.trim()) {
        await this.typeBotMessage(output)
      }
    },


    async typeBotMessage(fullText) {
      this.loading = false
      this.typingMessage = ''
      if (this.typingInterval) {
        clearInterval(this.typingInterval)
        this.typingInterval = null
      }
      // ส่งข้อความ bot ทีเดียว ไม่ต้องพิมพ์ทีละตัว
      this.messages.push({ role: 'bot', text: fullText, timestamp: new Date() })
      this.typingMessage = null
      this.$nextTick(this.scrollToBottom)
    },

    autoResize() {
      const textarea = this.$refs.inputBox
      if (textarea) {
        textarea.style.height = 'auto'
        textarea.style.overflowY = 'hidden'
        textarea.style.height = textarea.scrollHeight + 'px'
        if (textarea.scrollHeight > 132) {
          textarea.style.height = '132px'
          textarea.style.overflowY = 'auto'
        }
      }
    },

    copyToClipboard(text, index, event) {
      const temp = document.createElement('div')
      temp.innerHTML = text
      const plainText = temp.textContent || temp.innerText || ''
      navigator.clipboard.writeText(plainText).then(() => {
        this.copiedIndex = index
        if (event?.target) event.target.blur()
        setTimeout(() => this.copiedIndex = null, 3000)
      })
    },

    scrollToBottom() {
      const container = this.$refs.messagesContainer
      if (container) {
        container.scrollTop = container.scrollHeight
        this.showScrollToBottom = false
      }
    },

    handleScroll() {
      const container = this.$refs.messagesContainer
      if (!container) return
      const threshold = 80
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
      this.showScrollToBottom = !isAtBottom
    },

    formatRelativeTime(date) {
      if (!date) return ''
      const now = new Date()
      const d = new Date(date)
      const diff = Math.floor((now - d) / 1000)
      if (diff < 60) return 'ส่งเมื่อสักครู่'
      if (diff < 3600) return `ส่งเมื่อ ${Math.floor(diff / 60)} นาทีที่แล้ว`
      if (diff < 86400) return `ส่งเมื่อ ${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
      return `ส่งเมื่อ ${Math.floor(diff / 86400)} วันที่แล้ว`
    },

    formatFullDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    },

    updateSelectWidth() {
      const measurer = this.$refs.widthMeasurer
      const select = this.$refs.programSelect
      if (measurer && select) {
        const computed = window.getComputedStyle(select)
        measurer.style.font = computed.font
        measurer.style.fontSize = computed.fontSize
        measurer.style.fontFamily = computed.fontFamily
        measurer.style.fontWeight = computed.fontWeight
        measurer.style.padding = computed.padding
        measurer.style.border = computed.border
        measurer.style.letterSpacing = computed.letterSpacing
        measurer.style.whiteSpace = 'pre'
        const basePadding = 25
        this.selectWidth = Math.max(measurer.offsetWidth + basePadding, 120)
      }
    },
    updateTypeSelectWidth() {
      const measurer = this.$refs.typeWidthMeasurer
      const select = this.$refs.typeSelect
      if (measurer && select) {
        const computed = window.getComputedStyle(select)
        measurer.style.font = computed.font
        measurer.style.fontSize = computed.fontSize
        measurer.style.fontFamily = computed.fontFamily
        measurer.style.fontWeight = computed.fontWeight
        measurer.style.padding = computed.padding
        measurer.style.border = computed.border
        measurer.style.letterSpacing = computed.letterSpacing
        measurer.style.whiteSpace = 'pre'
        const basePadding = 25
        this.typeSelectWidth = Math.max(measurer.offsetWidth + basePadding, 120)
      }
    }
  },
  created() {
    this.generateTableFromObject = (data) => {
      if (!data || typeof data !== 'object') return ''

      const chunkSize = 4
      let html = ''

      const renderValue = (val) => {
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') {
          if (Array.isArray(val)) {
            return `<pre style="margin:0;">${JSON.stringify(val, null, 2)}</pre>`
          } else {
            // ถ้า object มี key <= 4 (เช่น สาเหตุ, วิธีแก้ไข, ระยะสั้น, ระยะยาว) ให้แสดงแนวตั้ง
            const keys = Object.keys(val)
            if (keys.length > 0 && keys.length <= 4) {
              return `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; margin: 0.2rem 0 0 0; font-size: 14px;">
                <tbody>
                  ${keys.map(k => `
                    <tr>
                      <th style="background:#eee;text-align:left;vertical-align:top;min-width:90px;">${k}</th>
                      <td style="vertical-align:top;">${renderValue(val[k])}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`
            }
            // ถ้าไม่เข้าเงื่อนไข ให้แสดงแบบเดิม
            return `<div style="margin:0.2rem 0 0 0;">${this.generateTableFromObject(val)}</div>`
          }
        }
        return String(val)
      }

      // ฟังก์ชันแบ่งคีย์เป็นกลุ่ม [4,2,4,4,...] เฉพาะเท่าที่เหลือจริง
      function splitKeys(keys) {
        const result = []
        let i = 0
        if (keys.length > 0) {
          // กลุ่มแรก 4
          const end = Math.min(i + 4, keys.length)
          result.push(keys.slice(i, end))
          i = end
        }
        if (keys.length > i) {
          // กลุ่มที่สอง 2
          const end = Math.min(i + 2, keys.length)
          result.push(keys.slice(i, end))
          i = end
        }
        // ที่เหลือกลุ่มละ 4
        while (i < keys.length) {
          const end = Math.min(i + 4, keys.length)
          result.push(keys.slice(i, end))
          i = end
        }
        return result
      }

      if (Array.isArray(data)) {
        if (data.length === 0) return '<p>ไม่มีข้อมูล</p>'

        data.forEach((item, idx) => {
          const keys = Object.keys(item)
          const keyGroups = splitKeys(keys)
          keyGroups.forEach(chunkKeys => {
            html += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; table-layout: auto; width: auto; min-width: 100%; margin-bottom: 0.6rem; font-size: 14px;">
                <thead>
                  <tr>
                    ${chunkKeys.map(k => `<th style="background:#eee;text-align:left;vertical-align:top;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:110px;max-width:220px;padding:6px 12px;word-break:keep-all;">${k}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    ${chunkKeys.map(k => `<td style="vertical-align:top;">${renderValue(item[k])}</td>`).join('')}
                  </tr>
                </tbody>
              </table>`
          })
        })

      } else {
        const keys = Object.keys(data)
        const keyGroups = splitKeys(keys)
        keyGroups.forEach(chunkKeys => {
          html += `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; table-layout: auto; width: auto; min-width: 100%; margin-bottom: 0.6rem; font-size: 14px;">
              <thead>
                <tr>
                  ${chunkKeys.map(k => `<th style="background:#eee;text-align:left;vertical-align:top;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:110px;max-width:220px;padding:6px 12px;word-break:keep-all;">${k}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${chunkKeys.map(k => `<td style="vertical-align:top;">${renderValue(data[k])}</td>`).join('')}
                </tr>
              </tbody>
            </table>`
        })
      }

      return html
    }
  },
  beforeDestroy() {
    if (this.typingInterval) {
      clearInterval(this.typingInterval)
      this.typingInterval = null
    }
  },
}
</script>

<style scoped>
.chat-container {
  width: calc(100vw - 40px); /* เดิม -40px เพิ่มเป็น -30px */
  height: calc(100vh - 40px);
  max-width: 900px; /* เดิม 700px เพิ่มเป็น 710px */
  min-height: 600px;
  margin: 20px auto;
  border: none;
  padding: 0;
  border-radius: 22px;
  background: linear-gradient(135deg, #f8fafc 0%, #e3e9f7 100%);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.10);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: box-shadow 0.2s;
}

.messages {
  flex: 1 1 0%;
  max-height: none;
  min-height: 0;
  overflow-y: auto;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2.5rem 1.5rem 1.5rem 1.5rem;
  position: relative;
  background: transparent;
  border-radius: 18px;
}

.welcome-message {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  color: #6b7280;
  font-size: 2rem;
  font-weight: 600;
  opacity: 0.85;
  text-align: center;
  width: 100%;
  pointer-events: none;
  z-index: 1;
  letter-spacing: 0.5px;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 0.2rem;
  margin-left: 32px;
  margin-right: 32px;
}
.message-row.user {
  align-items: flex-end;
}
.message {
  margin: 0;
  padding: 1rem 1.5rem;
  border-radius: 22px;
  display: inline-block;
  /* ลบ max-width: 80%; */
  word-break: break-word;
  font-size: 1.12rem;
  box-shadow: 0 2px 12px rgba(67,100,247,0.07);
  transition: background 0.2s;
  line-height: 1.6;
}
.message-with-copy {
  position: relative;
  background: #fff;
  border-radius: 12px;
  display: block;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow-x: auto;
  /* ไม่ต้องมี padding-top/padding-right ตรงนี้ */
}
.user .message {
  background: linear-gradient(90deg, #6fb1fc 0%, #4364f7 100%);
  color: #fff;
  align-self: flex-end;
  text-align: left;
  border-bottom-right-radius: 8px;
  border-top-right-radius: 22px;
  border-top-left-radius: 22px;
  border-bottom-left-radius: 22px;
  box-shadow: 0 2px 8px rgba(67,100,247,0.10);
}
.bot .message {
  background: linear-gradient(90deg, #eeeeee 0%, #e9e9e9 100%);
  color: #222;
  align-self: flex-start;
  text-align: left;
  border-bottom-left-radius: 8px;
  border-top-right-radius: 22px;
  border-top-left-radius: 22px;
  border-bottom-right-radius: 22px;
  box-shadow: 0 2px 8px rgba(67,100,247,0.04);
}
.timestamp {
  font-size: 0.85rem;
  color: #a0aec0;
  margin-top: 0.2rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  user-select: none;
  cursor: pointer;
  align-self: flex-start;
}
.message-row.user .timestamp {
  align-self: flex-end;
}

.input-area {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.7rem 1rem;
  margin: 0 60px 1.5rem 45px;
}

textarea {
  flex: 1;
  padding: 1rem 1.2rem;
  border-radius: 18px;
  border: 1.5px solid #c7d0e1;
  font-size: 1.08rem;
  outline: none;
  background: #fff;
  transition: border 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(67,100,247,0.04);
  min-height: 44px;
  max-height: 132px;
  resize: none;
  text-align: left;
}
/* ซ่อนพื้นหลัง scrollbar ของ textarea */
textarea::-webkit-scrollbar {
  width: 8px;
  background: transparent;
}
textarea::-webkit-scrollbar-thumb {
  background: #c7d0e1;
  border-radius: 8px;
}
textarea::-webkit-scrollbar-track {
  background: transparent;
}

/* สำหรับ Firefox */
textarea {
  scrollbar-width: thin;
  scrollbar-color: #c7d0e1 transparent;
}
textarea:focus {
  border: 1.5px solid #6fb1fc;
  box-shadow:
    0 0 0 4px rgba(111, 177, 252, 0.18), 
    0 2px 8px rgba(67,100,247,0.10); /* เพิ่มเงาเมื่อ focus */
  transition: box-shadow 0.2s, border 0.2s;
}

button {
  padding: 0.9rem 1.5rem;
  border-radius: 18px;
  border: none;
  background: linear-gradient(90deg, #6fb1fc 0%, #4364f7 100%);
  color: white;
  font-weight: 600;
  font-size: 1.08rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(67,100,247,0.10);
  transition: background 0.2s, transform 0.1s;
  letter-spacing: 0.5px;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.2);
}

.thinking-message {
  color: #6b7280;
  font-size: 1.08rem;
  font-style: italic;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.dot {
  width: 8px;
  height: 8px;
  background-color: #6fb1fc;
  border-radius: 50%;
  display: inline-block;
  animation: blink 1.4s infinite both;
}

.dot:nth-child(1) { animation-delay: 0s; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes blink {
  0%, 80%, 100% { opacity: 0.2; }
  40% { opacity: 1; }
}

.scroll-to-bottom-btn {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 7.5rem;
  z-index: 10;
  background: #fff;
  border: 1.5px solid #6fb1fc;
  color: #4364f7;
  border-radius: 50%;
  width: 36px;      /* เล็กลง */
  height: 36px;     /* เล็กลง */
  font-size: 1.2rem;/* เล็กลง */
  box-shadow: 0 2px 8px rgba(67,100,247,0.10);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, background 0.2s;
  opacity: 0.92;
  padding: 0;
}
.scroll-to-bottom-btn:hover {
  background: #e3e9f7;
  opacity: 1;
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
.messages {
  position: relative; /* เพื่อให้ปุ่มอยู่ในกรอบ */
}

.message-wrapper {
  position: relative;
  display: inline-block;
}

.message-with-copy {
  position: relative;
  background: #fff;
  border-radius: 12px;
  display: block;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  word-wrap: break-word;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  overflow-x: auto;
  /* ไม่ต้องมี padding-top/padding-right ตรงนี้ */
}
.message-with-copy.with-copy {
  padding-top: 2rem;    /* เฉพาะกล่องที่มีปุ่มคัดลอก */
  padding-right: 3rem;
}
.copy-button-wrapper {
  position: absolute;
  top: 0.5rem;
  right: 1.2rem; /* เดิม 0.5rem เพิ่มเป็น 1.2rem */
  z-index: 2;
}

.copy-btn-inside {
  font-size: 0.78rem;
  color: #222;
  background: none;
  border: none;
  border-radius: 0;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: color 0.15s;
  outline: none;
  user-select: none;
}
.copy-btn-inside:hover,
.copy-btn-inside:focus {
  color: #6fb1fc;
  background: none;
}

.program-select-area {
  margin: 0 60px 0 45px;
  padding-bottom: 0.5rem;
  display: flex;
  align-items: center;
  position: relative;
}
.program-select-area select {
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border: 1.2px solid #c7d0e1;
  font-size: 1rem;
  background: #fff;
  min-width: 0;
  outline: none;
  transition: width 0.2s;
  /* ลบ min-width เดิมออก */
}
.program-select-area select:focus {
  outline: none;
  box-shadow: none;
}
.program-select-area label {
  font-size: 1rem;
  color: #444;
}
/* span สำหรับวัดความกว้าง select */
.select-width-measurer {
  position: absolute;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  white-space: pre;
  left: 0;
  top: 0;
  pointer-events: none;
  z-index: -1;
}

.type-select-area {
  margin: 0 60px 0 45px;
  padding-bottom: 0.5rem;
  display: flex;
  align-items: center;
  position: relative;
}
.type-select-area select {
  padding: 0.4rem 1rem;
  border-radius: 8px;
  border: 1.2px solid #c7d0e1;
  font-size: 1rem;
  background: #fff;
  min-width: 0;
  outline: none;
  transition: width 0.2s;
}
.type-select-area select:focus {
  outline: none;
  box-shadow: none;
}
.type-select-area label {
  font-size: 1rem;
  color: #444;
}

/* ลด margin-bottom ของตาราง และบังคับตารางสุดท้ายไม่ให้มีช่องว่างล่าง */
.messages .message-text table {
  margin-bottom: 0.6rem !important;
}
.messages .message-text table:last-child {
  margin-bottom: 0 !important;
}
/* ชิดบนสำหรับ cell ทุกตัวในตาราง */
.messages .message-text th,
.messages .message-text td {
  vertical-align: top;
}
/* เพิ่มเติม: บังคับหัว column ไม่ตัดบรรทัด */
.messages .message-text th {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 110px;
  max-width: 220px;
  padding: 6px 12px;
  word-break: keep-all;
}
</style>