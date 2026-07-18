/**
 * Repository dei dati utente: schede, esercizi custom, label di finalità.
 * Due implementazioni con la stessa interfaccia:
 *  - Firestore (utente reale, offline-first grazie alla cache persistente)
 *  - localStorage (modalità demo)
 */
import {
  collection, doc, getDocs, setDoc, deleteDoc, getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const newId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`)

/* ---------------- localStorage (demo) ---------------- */

const ls = {
  read(key) {
    try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] }
  },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)) },
}

function makeLocalRepo() {
  const K = { plans: 'gym.plans', custom: 'gym.customExercises', labels: 'gym.labels' }
  return {
    async listPlans() {
      return ls.read(K.plans).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    async getPlan(id) {
      return ls.read(K.plans).find((p) => p.id === id) || null
    },
    async savePlan(plan) {
      const plans = ls.read(K.plans).filter((p) => p.id !== plan.id)
      const saved = { ...plan, id: plan.id || newId(), updatedAt: Date.now(), createdAt: plan.createdAt || Date.now() }
      plans.push(saved)
      ls.write(K.plans, plans)
      return saved
    },
    async deletePlan(id) {
      ls.write(K.plans, ls.read(K.plans).filter((p) => p.id !== id))
    },
    async listCustomExercises() {
      return ls.read(K.custom)
    },
    async saveCustomExercise(ex) {
      const all = ls.read(K.custom).filter((e) => e.id !== ex.id)
      const saved = { ...ex, id: ex.id || newId(), createdAt: ex.createdAt || Date.now() }
      all.push(saved)
      ls.write(K.custom, all)
      return saved
    },
    async deleteCustomExercise(id) {
      ls.write(K.custom, ls.read(K.custom).filter((e) => e.id !== id))
    },
    async getLabels() {
      return ls.read(K.labels)
    },
    async addLabels(labels) {
      const all = [...new Set([...ls.read(K.labels), ...labels])]
      ls.write(K.labels, all)
      return all
    },
  }
}

/* ---------------- Firestore ---------------- */

function makeFirestoreRepo(uid) {
  const plansCol = () => collection(db, 'users', uid, 'workoutPlans')
  const customCol = () => collection(db, 'users', uid, 'customExercises')
  const labelsDoc = () => doc(db, 'users', uid, 'meta', 'labels')

  return {
    async listPlans() {
      const snap = await getDocs(plansCol())
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    },
    async getPlan(id) {
      const snap = await getDoc(doc(plansCol(), id))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    },
    async savePlan(plan) {
      const id = plan.id || newId()
      const saved = { ...plan, id, updatedAt: Date.now(), createdAt: plan.createdAt || Date.now() }
      const { id: _omit, ...data } = saved
      await setDoc(doc(plansCol(), id), data)
      return saved
    },
    async deletePlan(id) {
      await deleteDoc(doc(plansCol(), id))
    },
    async listCustomExercises() {
      const snap = await getDocs(customCol())
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    },
    async saveCustomExercise(ex) {
      const id = ex.id || newId()
      const saved = { ...ex, id, createdAt: ex.createdAt || Date.now() }
      const { id: _omit, ...data } = saved
      await setDoc(doc(customCol(), id), data)
      return saved
    },
    async deleteCustomExercise(id) {
      await deleteDoc(doc(customCol(), id))
    },
    async getLabels() {
      const snap = await getDoc(labelsDoc())
      return snap.exists() ? snap.data().values || [] : []
    },
    async addLabels(labels) {
      const current = await this.getLabels()
      const all = [...new Set([...current, ...labels])]
      await setDoc(labelsDoc(), { values: all })
      return all
    },
  }
}

/* ---------------- factory ---------------- */

const cache = new Map()

export function getRepo(user) {
  const key = user.isDemo ? 'demo' : user.uid
  if (!cache.has(key)) {
    cache.set(key, user.isDemo ? makeLocalRepo() : makeFirestoreRepo(user.uid))
  }
  return cache.get(key)
}
