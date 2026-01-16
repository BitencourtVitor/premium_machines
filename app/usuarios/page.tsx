'use client'

import Header from '@/app/components/Header'
import BottomNavigation from '@/app/components/BottomNavigation'
import Sidebar from '@/app/components/Sidebar'
import PageTabs from '@/app/components/PageTabs'
import { useSidebar } from '@/lib/useSidebar'
import UserModal from './components/UserModal'
import SupplierModal from './components/SupplierModal'
import DeleteUserModal from './components/DeleteUserModal'
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
    handleValidate,
    handleDelete,
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
        <main className={`flex-1 p-4 md:p-6 md:overflow-hidden md:flex md:flex-col transition-all duration-250 ease-in-out ${isExpanded ? 'md:ml-48 lg:ml-64' : 'md:ml-16 lg:ml-20'}`}>
          <div className="max-w-7xl mx-auto md:flex md:flex-col md:flex-1 md:overflow-hidden md:w-full">
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
                onDelete={(u) => {
                  setUserToDelete(u)
                  setShowDeleteModal(true)
                  setError('')
                }}
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
                onDeleteUser={(u) => {
                  setUserToDelete(u)
                  setShowDeleteModal(true)
                  setError('')
                }}
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

      <DeleteUserModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setUserToDelete(null)
          setError('')
        }}
        userToDelete={userToDelete}
        onDelete={handleDelete}
        deleting={deleting}
        error={error}
      />
    </div>
  )
}
