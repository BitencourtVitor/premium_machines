'use client'

import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import PageTabs from '@/app/components/PageTabs'
import ConfirmModal from '@/app/components/ConfirmModal'
import { useSidebar } from '@/lib/useSidebar'
import UserModal from './components/UserModal'
import SupplierModal from './components/SupplierModal'
import UsersTab from './components/UsersTab'
import SuppliersTab from './components/SuppliersTab'
import { useUsersPage } from './hooks/useUsersPage'

export default function UsuariosPage() {
  const { isExpanded } = useSidebar()
  const {
    users,
    suppliers,
    loading,
    loadingUsers,
    loadingSuppliers,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    showSupplierModal,
    setShowSupplierModal,
    editingUser,
    setEditingUser,
    editingSupplier,
    setEditingSupplier,
    selectedSupplier,
    setSelectedSupplier,
    formData,
    setFormData,
    saving,
    savingSupplier,
    error,
    setError,
    userToDelete,
    setUserToDelete,
    showDeleteModal,
    setShowDeleteModal,
    deleting,
    expandedSuppliers,
    showArchivedSuppliers,
    setShowArchivedSuppliers,
    supplierFormData,
    setSupplierFormData,
    loadUsers,
    loadSuppliers,
    handleOpenModal,
    handleSave,
    handleSaveSupplier,
    handleOpenSupplierModal,
    handleArchiveSupplier,
    handleUnarchiveSupplier,
    executeSupplierStatusChange,
    confirmModal,
    setConfirmModal,
    handleValidate,
    handleDelete,
    openDeleteConfirm,
    toggleSupplierExpansion,
    fixedRole,
    fixedSupplierId,
  } = useUsersPage()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen md:h-screen md:max-h-screen bg-gray-50 dark:bg-gray-900 pb-safe-content md:pb-0 md:flex md:flex-col md:overflow-hidden">
      <Header />
      <div className="flex md:flex-1 md:overflow-hidden">
        <Sidebar />
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-300 ease-in-out ${isExpanded ? 'md:ml-52' : 'md:ml-16'}`}>
          <div className="w-full md:flex md:flex-col md:flex-1 md:overflow-hidden">
            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4 flex-shrink-0 overflow-hidden">
              <PageTabs
                tabs={[
                  { id: 'users', label: 'Funcionários' },
                  { id: 'suppliers', label: 'Fornecedores' },
                ]}
                activeId={activeTab}
                onChange={(id) => {
                  setActiveTab(id as 'users' | 'suppliers')
                  if (id === 'suppliers') {
                    loadSuppliers()
                  }
                }}
              />
            </div>

            {/* Users Tab */}
            {activeTab === 'users' && (
              <UsersTab
                users={users}
                loading={loadingUsers}
                onReload={loadUsers}
                onEdit={handleOpenModal}
                onValidate={handleValidate}
                onDelete={openDeleteConfirm}
              />
            )}

            {/* Suppliers Tab */}
            {activeTab === 'suppliers' && (
              <SuppliersTab
                suppliers={suppliers}
                users={users}
                loadingSuppliers={loadingSuppliers}
                showArchivedSuppliers={showArchivedSuppliers}
                expandedSuppliers={expandedSuppliers}
                onToggleExpand={toggleSupplierExpansion}
                onEditSupplier={handleOpenSupplierModal}
                onArchiveSupplier={handleArchiveSupplier}
                onUnarchiveSupplier={handleUnarchiveSupplier}
                onReload={loadSuppliers}
                onToggleArchived={(show) => {
                  setShowArchivedSuppliers(show)
                  loadSuppliers(show)
                  loadUsers()
                }}
                onValidateUser={handleValidate}
                onEditUser={handleOpenModal}
                onDeleteUser={openDeleteConfirm}
              />
            )}
          </div>
        </main>
      </div>

      <BottomNavigation />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => {
          setShowSupplierModal(false)
          setEditingSupplier(null)
          setSupplierFormData({
            nome: '',
            email: '',
            telefone: '',
            supplier_type: 'rental',
          })
        }}
        editingSupplier={editingSupplier}
        onSave={handleSaveSupplier}
        saving={savingSupplier}
        formData={supplierFormData}
        setFormData={setSupplierFormData}
        error={error}
      />

      <UserModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        editingUser={editingUser}
        onSave={handleSave}
        saving={saving}
        formData={formData}
        setFormData={setFormData}
        error={error}
        suppliers={suppliers}
        selectedSupplier={selectedSupplier}
        setSelectedSupplier={setSelectedSupplier}
        fixedRole={fixedRole}
        fixedSupplierId={fixedSupplierId}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmButtonText={confirmModal.confirmButtonText}
        isDangerous={confirmModal.isDangerous}
        isLoading={confirmModal.isLoading}
        error={error}
      />
    </div>
  )
}
