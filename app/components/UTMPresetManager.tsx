// UTM Preset Manager (placeholder content)
import React from 'react'
import { Card, Button, Input, Table, Modal, ConfirmDialog } from '../ui'

interface UTMPreset {
  id: string
  name: string
  source: string
  medium: string
  campaign: string
}

const mockPresets: UTMPreset[] = [
  { id: '1', name: 'Facebook Summer Sale', source: 'facebook', medium: 'social', campaign: 'summer_sale_2024' },
  { id: '2', name: 'Google Ads New Collection', source: 'google', medium: 'cpc', campaign: 'new_collection_q3' },
  { id: '3', name: 'Newsletter Promo', source: 'email', medium: 'email', campaign: 'weekly_digest_promo' },
]

const UTMPresetManager: React.FC = () => {
  const [presets, setPresets] = React.useState<UTMPreset[]>(mockPresets)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false)
  const [editingPreset, setEditingPreset] = React.useState<UTMPreset | null>(null)
  const [presetToDelete, setPresetToDelete] = React.useState<UTMPreset | null>(null)

  const handleOpenModal = (preset: UTMPreset | null = null) => {
    setEditingPreset(preset)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPreset(null)
  }

  const handleSavePreset = (formData: UTMPreset) => {
    if (editingPreset) {
      setPresets(presets.map(p => (p.id === formData.id ? formData : p)))
    } else {
      setPresets([...presets, { ...formData, id: String(Date.now()) }])
    }
    handleCloseModal()
  }

  const handleConfirmDelete = (preset: UTMPreset) => {
    setPresetToDelete(preset)
    setIsConfirmDeleteOpen(true)
  }

  const handleCancelDelete = () => {
    setIsConfirmDeleteOpen(false)
    setPresetToDelete(null)
  }

  const handleDelete = () => {
    if (presetToDelete) {
      setPresets(presets.filter(p => p.id !== presetToDelete.id))
      handleCancelDelete()
    }
  }

  return (
    <Card
      title="UTM Preset Manager"
      headerAction={<Button variant="accent" onClick={() => handleOpenModal()}><span role="img" aria-label="plus" className="mr-2 leading-none">➕</span>Add Preset</Button>}
    >
      <Table headers={['Name', 'Source', 'Medium', 'Campaign', 'Actions']}>
        {presets.map(preset => (
          <tr key={preset.id}>
            <td className="px-6 py-3 font-medium">{preset.name}</td>
            <td className="px-6 py-3">{preset.source}</td>
            <td className="px-6 py-3">{preset.medium}</td>
            <td className="px-6 py-3">{preset.campaign}</td>
            <td className="px-6 py-3 flex flex-wrap gap-2 justify-end">
              <Button size="sm" variant="secondary" onClick={() => handleOpenModal(preset)}><span role="img" aria-label="edit" className="leading-none">✏️</span></Button>
              <Button size="sm" variant="destructive" onClick={() => handleConfirmDelete(preset)}><span role="img" aria-label="trash" className="leading-none">🗑️</span></Button>
            </td>
          </tr>
        ))}
      </Table>

      <Modal open={isModalOpen} onClose={handleCloseModal} title={editingPreset ? 'Edit UTM Preset' : 'Add New UTM Preset'}>
        <PresetForm preset={editingPreset} onSave={handleSavePreset} onCancel={handleCloseModal} />
      </Modal>

      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleDelete}
        title="Confirm Delete"
        body={`Are you sure you want to delete the preset "${presetToDelete?.name}"?`}
        confirmLabel="Delete"
        tone="danger"
      />
    </Card>
  )
}

interface PresetFormProps {
  preset: UTMPreset | null
  onSave: (preset: UTMPreset) => void
  onCancel: () => void
}

const PresetForm: React.FC<PresetFormProps> = ({ preset, onSave, onCancel }) => {
  const [formData, setFormData] = React.useState<UTMPreset>(
    preset || { id: '', name: '', source: '', medium: '', campaign: '' }
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Preset Name" name="name" value={formData.name} onChange={handleChange} required />
      <Input label="UTM Source" name="source" value={formData.source} onChange={handleChange} required />
      <Input label="UTM Medium" name="medium" value={formData.medium} onChange={handleChange} required />
      <Input label="UTM Campaign" name="campaign" value={formData.campaign} onChange={handleChange} required />
      <div className="flex justify-end space-x-3 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save Preset</Button>
      </div>
    </form>
  )
}

export default UTMPresetManager