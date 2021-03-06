# frozen_string_literal: true

require 'spec_helper'

describe Gitlab::ImportExport::SnippetRepoRestorer do
  let_it_be(:user) { create(:user) }

  let(:project) { create(:project, namespace: user.namespace) }
  let(:snippet) { create(:project_snippet, project: project, author: user) }
  let(:shared) { project.import_export_shared }
  let(:exporter) { Gitlab::ImportExport::SnippetsRepoSaver.new(project: project, shared: shared, current_user: user) }
  let(:restorer) do
    described_class.new(user: user,
                        shared: shared,
                        snippet: snippet,
                        path_to_bundle: snippet_bundle_path)
  end

  after do
    FileUtils.rm_rf(shared.export_path)
  end

  shared_examples 'no bundle file present' do
    it 'creates the repository from the database content' do
      expect(snippet.repository_exists?).to be_falsey

      aggregate_failures do
        expect(restorer.restore).to be_truthy

        expect(snippet.repository_exists?).to be_truthy
        expect(snippet.snippet_repository).not_to be_nil

        blob = snippet.repository.blob_at('HEAD', snippet.file_name)
        expect(blob).not_to be_nil
        expect(blob.data).to eq(snippet.content)
      end
    end
  end

  context 'when the snippet does not have a bundle file path' do
    let(:snippet_bundle_path) { nil }

    it_behaves_like 'no bundle file present'
  end

  context 'when the snippet bundle path is not present' do
    let(:snippet_bundle_path) { 'foo' }

    it_behaves_like 'no bundle file present'
  end

  context 'when the snippet repository bundle exists' do
    let!(:snippet_with_repo) { create(:project_snippet, :repository, project: project, author: user) }
    let(:bundle_path) { ::Gitlab::ImportExport.snippets_repo_bundle_path(shared.export_path) }
    let(:snippet_bundle_path) { File.join(bundle_path, "#{snippet_with_repo.hexdigest}.bundle") }
    let(:result) { exporter.save }
    let(:repository) { snippet.repository }

    before do
      expect(exporter.save).to be_truthy
    end

    context 'when it is valid' do
      before do
        allow(repository).to receive(:branch_count).and_return(1)
        allow(repository).to receive(:tag_count).and_return(0)
        allow(repository).to receive(:branch_names).and_return(['master'])
        allow(repository).to receive(:ls_files).and_return(['foo'])
      end

      it 'creates the repository from the bundle' do
        expect(snippet.repository_exists?).to be_falsey
        expect(snippet.snippet_repository).to be_nil
        expect(repository).to receive(:create_from_bundle).and_call_original

        expect(restorer.restore).to be_truthy
        expect(snippet.repository_exists?).to be_truthy
        expect(snippet.snippet_repository).not_to be_nil
      end

      it 'sets same shard in snippet repository as in the repository storage' do
        expect(repository).to receive(:storage).and_return('picked')
        expect(repository).to receive(:create_from_bundle)

        expect(restorer.restore).to be_truthy
        expect(snippet.snippet_repository.shard_name).to eq 'picked'
      end
    end

    context 'when it is invalid' do
      it 'returns false and deletes the repository from disk and the database' do
        gitlab_shell = Gitlab::Shell.new
        shard_name = snippet.repository.shard
        path = snippet.disk_path + '.git'
        error_response = ServiceResponse.error(message: 'Foo', http_status: 400)

        allow_next_instance_of(Snippets::RepositoryValidationService) do |instance|
          allow(instance).to receive(:execute).and_return(error_response)
        end

        aggregate_failures do
          expect(restorer.restore).to be false
          expect(shared.errors.first).to match(/Invalid repository bundle/)
          expect(snippet.repository_exists?).to eq false
          expect(snippet.reload.snippet_repository).to be_nil
          expect(gitlab_shell.repository_exists?(shard_name, path)).to eq false
        end
      end
    end
  end
end
